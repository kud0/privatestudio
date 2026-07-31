/**
 * GUARDIÁN DE CAMPAÑA — Circuit Festival 2026 · Private Studio (608-571-5182)
 *
 * Qué es: un Google Ads Script. Se ejecuta DENTRO de Google Ads, con los permisos
 * de la cuenta. No necesita developer token, ni OAuth, ni que nadie tenga sesión
 * abierta — por eso es el único mecanismo fiable cuando Alex no está delante.
 *
 * Instalación (una vez, con la campaña ya creada):
 *   Google Ads → Herramientas → Acciones masivas → Scripts → +
 *   Pegar este archivo · Autorizar · Vista previa · Guardar
 *   Programar: "Cada hora"
 *
 * Qué hace cada hora:
 *   1. Agenda: si CONTROL_URL dice {"estado":"pausa"} (sin huecos en 48 h), pausa.
 *      Si dice "activa", ajusta el presupuesto diario al que indique el control.
 *      Si no responde, NO toca nada.
 *   2. Tope de gasto del periodo: si el gasto acumulado supera TOPE_PERIODO,
 *      pausa y avisa. Es la red de seguridad contra un error de configuración.
 *   3. Horario: fuera del horario de apertura, pausa. Complementa al ad schedule.
 *   4. Aviso por email al llegar al 80% del tope.
 *
 * Diseño: por defecto NO hace nada destructivo. Ante cualquier duda (fallo de red,
 * respuesta ilegible) deja la campaña como está y avisa. Preferimos gastar de más
 * un día que apagar la campaña por un error de lectura en pleno pico.
 */

// ─── Configuración ──────────────────────────────────────────────────────────

var CAMPANA = 'PS | Search | Barcelona';   // campaignId 22697186771

// Tope de gasto acordado con el cliente para toda la ventana, en euros.
// Decisión de Alex el 31 jul: 200 € del 1 al 15 de agosto.
var TOPE_PERIODO = 200;

var INICIO = '2026-08-01';
var FIN    = '2026-08-15';

// Horario de apertura del estudio, hora de Madrid. 0 = domingo.
// Fuente: configuración de Booksy (open_hours), contrastada con los huecos reales
// y con el footer de la web. Verificado el 31 jul 2026.
var HORARIO = {
  0: null,          // domingo cerrado
  1: [11, 20],
  2: [11, 20],
  3: [11, 20],
  4: [11, 20],
  5: [11, 20],
  6: [11, 19]       // sábado
};

// Excepción: domingo 2 de agosto, franja de tarde solo para reserva online
// del día siguiente (el estudio está cerrado, pero Booksy acepta reservas).
var DOMINGO_2_TARDE = { fecha: '2026-08-02', desde: 17, hasta: 23 };

// Control publicado por el cron de Booksy. Formato:
//   {"estado":"activa"|"pausa", "presupuesto_diario": 10|20|30, "motivo": "..."}
// Si no responde o es ilegible, el guardián no toca ni estado ni presupuesto.
var CONTROL_URL = 'https://www.barberbarcelona.es/ads-control.json';

var EMAIL_AVISOS = 'alexsole@gmail.com';

var UMBRAL_AVISO = 0.8;   // avisar al consumir este % del tope

// ─── Ejecución ──────────────────────────────────────────────────────────────

function main() {
  var campana = buscarCampana(CAMPANA);
  if (!campana) {
    avisar('Guardián: campaña no encontrada',
           'No existe ninguna campaña llamada "' + CAMPANA + '". El guardián no ha hecho nada.');
    return;
  }

  var ahora = new Date();
  var registro = [];

  // 1 · Interruptor manual (tiene prioridad sobre todo lo demás)
  var control = leerControl();
  registro.push('control=' + control.estado);

  if (control.estado === 'pausa') {
    if (campana.isEnabled()) {
      campana.pause();
      avisar('Campaña pausada: agenda llena',
             'La campaña "' + CAMPANA + '" se ha pausado. Motivo: ' + control.motivo);
    }
    Logger.log(registro.join(' | ') + ' → pausada por agenda llena');
    return;
  }

  // Presupuesto dinámico: el control indica cuánto merece la pena gastar hoy
  // según los huecos que quedan por delante. Redistribuye, no añade gasto: el
  // tope total sigue siendo TOPE_PERIODO.
  if (control.presupuesto > 0) {
    var presupuestoActual = campana.getBudget().getAmount();
    if (Math.abs(presupuestoActual - control.presupuesto) > 0.01) {
      campana.getBudget().setAmount(control.presupuesto);
      registro.push('presupuesto=' + presupuestoActual + '→' + control.presupuesto);
    }
  }

  // 2 · Tope de gasto del periodo
  var gastado = gastoPeriodo(campana);
  registro.push('gastado=' + gastado.toFixed(2));

  if (TOPE_PERIODO > 0 && gastado >= TOPE_PERIODO) {
    if (campana.isEnabled()) {
      campana.pause();
      avisar('Campaña pausada: tope de periodo alcanzado',
             'Gasto acumulado del periodo: €' + gastado.toFixed(2) +
             '. Tope configurado: €' + TOPE_PERIODO.toFixed(2) + '. La campaña queda pausada.');
    }
    Logger.log(registro.join(' | ') + ' → pausada por tope');
    return;
  }

  if (TOPE_PERIODO > 0 && gastado >= TOPE_PERIODO * UMBRAL_AVISO && !avisoYaEnviado()) {
    avisar('Aviso: ' + Math.round(UMBRAL_AVISO * 100) + '% del presupuesto consumido',
           'Gasto acumulado: €' + gastado.toFixed(2) + ' de €' + TOPE_PERIODO.toFixed(2) +
           '. La campaña sigue activa.');
    marcarAvisoEnviado();
  }

  // 3 · Horario de servicio
  var debeEstarActiva = dentroDeHorario(ahora);
  registro.push('horario=' + (debeEstarActiva ? 'abierto' : 'cerrado'));

  if (!debeEstarActiva && campana.isEnabled()) {
    campana.pause();
    Logger.log(registro.join(' | ') + ' → pausada por horario');
    return;
  }

  if (debeEstarActiva && !campana.isEnabled() && control.estado !== 'pausa') {
    campana.enable();
    Logger.log(registro.join(' | ') + ' → reactivada por horario');
    return;
  }

  Logger.log(registro.join(' | ') + ' → sin cambios');
}

// ─── Auxiliares ─────────────────────────────────────────────────────────────

function buscarCampana(nombre) {
  var it = AdsApp.campaigns().withCondition('Name = "' + nombre + '"').get();
  return it.hasNext() ? it.next() : null;
}

/** Gasto acumulado de la campaña dentro de la ventana del festival. */
function gastoPeriodo(campana) {
  var desde = INICIO.replace(/-/g, '');
  var hasta = FIN.replace(/-/g, '');
  var stats = campana.getStatsFor(desde, hasta);
  return stats.getCost();
}

/**
 * Lee el control publicado por el cron de Booksy.
 * Devuelve {estado, presupuesto, motivo}. Ante cualquier fallo devuelve estado
 * 'auto' y presupuesto 0: no se toca nada por un error de red.
 */
function leerControl() {
  var vacio = { estado: 'auto', presupuesto: 0, motivo: 'control no disponible' };
  if (!CONTROL_URL) return vacio;
  try {
    var resp = UrlFetchApp.fetch(CONTROL_URL, {
      muteHttpExceptions: true,
      followRedirects: true
    });
    if (resp.getResponseCode() !== 200) return vacio;
    var datos = JSON.parse(resp.getContentText());
    var estado = String(datos.estado || '').toLowerCase();
    return {
      estado: (estado === 'pausa' || estado === 'activa') ? estado : 'auto',
      presupuesto: Number(datos.presupuesto_diario) || 0,
      motivo: datos.motivo || ''
    };
  } catch (e) {
    Logger.log('Control ilegible (' + e + '). No se toca nada.');
    return vacio;
  }
}

/** ¿Está el estudio abierto en este momento? Hora de Madrid. */
function dentroDeHorario(fecha) {
  var zona = AdsApp.currentAccount().getTimeZone();
  var dia  = parseInt(Utilities.formatDate(fecha, zona, 'u'), 10) % 7;  // 7=domingo → 0
  var hora = parseInt(Utilities.formatDate(fecha, zona, 'H'), 10);
  var hoy  = Utilities.formatDate(fecha, zona, 'yyyy-MM-dd');

  if (hoy === DOMINGO_2_TARDE.fecha) {
    return hora >= DOMINGO_2_TARDE.desde && hora < DOMINGO_2_TARDE.hasta;
  }

  var franja = HORARIO[dia];
  if (!franja) return false;
  return hora >= franja[0] && hora < franja[1];
}

function avisar(asunto, cuerpo) {
  if (!EMAIL_AVISOS) return;
  MailApp.sendEmail(EMAIL_AVISOS,
    '[Private Studio · Circuit] ' + asunto,
    cuerpo + '\n\nCuenta 608-571-5182 · campaña "' + CAMPANA + '"' +
    '\nGenerado por el guardián automático el ' + new Date());
}

/** Evita repetir el aviso de 80% en cada ejecución horaria. */
function avisoYaEnviado() {
  var etiqueta = AdsApp.labels().withCondition('Name = "aviso-80-enviado"').get();
  return etiqueta.hasNext();
}

function marcarAvisoEnviado() {
  AdsApp.createLabel('aviso-80-enviado', 'Marca interna del guardián: aviso de 80% ya enviado');
}
