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
 *      Si no responde, NO toca nada. El importe diario no se toca: se fija a mano.
 *   2. Tope de gasto del periodo: si el gasto acumulado supera TOPE_PERIODO,
 *      pausa y avisa. Es la red de seguridad contra un error de configuración.
 *   3. Aviso por email al llegar al 80% del tope.
 *   4. Informe diario por correo: una vez al día, en la ejecución de las 8 h.
 *      Va dentro del guardián a propósito — un script aparte exigiría una
 *      autorización nueva de Google con passkey, y esto debe funcionar sin
 *      depender de que Alex esté delante.
 *
 * El horario NO lo gestiona este script: lo hace el ad schedule nativo de la
 * campaña (L–V 11–20, sáb 11–19, domingo nada). Duplicarlo aquí solo añadiría
 * riesgo de dejar la campaña pausada por un fallo de lectura.
 *
 * Diseño: por defecto NO hace nada destructivo. Ante cualquier duda (fallo de red,
 * respuesta ilegible) deja la campaña como está y avisa. Preferimos gastar de más
 * un día que apagar la campaña por un error de lectura en pleno pico.
 */

// ─── Configuración ──────────────────────────────────────────────────────────

var CAMPANA = 'PS | Search | Barcelona';   // campaignId 22697186771

// Tope de gasto para la ventana del festival. La campaña empieza el 1 de agosto
// y estos 200 € cubren del 1 al 15. Decisión de Alex, 1 ago.
var TOPE_PERIODO = 200;

// Lo gastado el 31 de julio, antes de que arrancara la ventana. No cuenta contra
// el tope; se publica solo para que el panel pueda enseñarlo y el número cuadre
// con lo que Google cobra de verdad.
var GASTADO_ANTES = 19.99;

var INICIO = '2026-08-01';
var FIN    = '2026-08-15';

// Control publicado por el cron de Booksy. Formato:
//   {"estado":"activa"|"pausa", "presupuesto_diario": 10|20|30, "motivo": "..."}
// Si no responde o es ilegible, el guardián no toca ni estado ni presupuesto.
var CONTROL_URL = 'https://www.barberbarcelona.es/ads-control.json';

// Horas que puede tener el control antes de dejar de creérselo.
//
// El cron que lo publica corre en un Mac, a las 9, 13, 17 y 21. Si ese Mac se
// apaga, se queda sin red, o la barbería migra de Booksy a otro sistema y el
// script deja de funcionar, el fichero se queda congelado — pero sigue
// respondiendo 200 y diciendo "activa". Sin esta comprobación el guardián se
// creería un dato de hace días y podría estar pagando clics con la agenda llena.
//
// El hueco mayor entre ejecuciones es de 21:00 a 9:00 (12 h), pero de noche la
// campaña no se anuncia; cuando arranca, a las 11:00, el control tiene 2 h como
// mucho. Ocho horas deja margen para un fallo puntual sin tolerar un silencio.
var MAX_HORAS_CONTROL = 8;

var EMAIL_AVISOS = 'alexsole@gmail.com';

var UMBRAL_AVISO = 0.8;   // avisar al consumir este % del tope

// Hora (0-23) a la que se envía el informe diario. La ejecución horaria que
// caiga en esta hora lo dispara; las demás no.
var HORA_INFORME = 8;

var URL_PANEL  = 'https://www.barberbarcelona.es/panel-76380b752010.html';
var URL_AGENDA = 'https://booksy.com/es-es/90283_private-studio_barberia_48863_barcelona';

// Hoja «PS Circuit 2026 — gasto». Publicada como CSV para que el panel pueda
// leer el gasto real sin necesidad de credenciales:
//   .../2PACX-1vQFDtzeZFuF68CwZCuBTt858Ysn9VIpej9rSOQpycXoQu_Qf7hXRJ5jl1JwMHedtw3qeGLkT9nKE-KP/pub?output=csv
// Es el único puente entre lo que Google Ads sabe y lo que el panel enseña.
var HOJA_ID = '16n-xk77i2ep7Vk5HKxbm8QEvme-RcIhcnm-vC5i6uf0';

// ─── Ejecución ──────────────────────────────────────────────────────────────

/**
 * Separa las dos responsabilidades: `proteger` decide y actúa sobre el dinero,
 * `publicarMetricas` solo informa. La publicación va en un finally para que
 * salga por cualquiera de las tres salidas de `proteger`, y dentro de su propio
 * try/catch: un fallo escribiendo la hoja nunca puede tumbar la protección.
 */
function main() {
  var campana = buscarCampana(CAMPANA);
  if (!campana) {
    avisar('Guardián: campaña no encontrada',
           'No existe ninguna campaña llamada "' + CAMPANA + '". El guardián no ha hecho nada.');
    return;
  }

  try {
    proteger(campana);
  } finally {
    try { publicarMetricas(campana); }
    catch (e) { Logger.log('No se pudo publicar en la hoja: ' + e); }
  }
}

function proteger(campana) {
  var registro = [];

  // 0 · Informe diario (antes que nada: debe salir aunque luego se pause)
  informeDiarioSiToca(campana);

  // 1 · Agenda: si no hay huecos en los próximos días abiertos, pausar
  var control = leerControl();
  registro.push('control=' + control.estado);

  // Control caducado: nadie sabe si queda hueco. Se para y se avisa. Perder unas
  // horas de anuncios es recuperable; pagar clics a una agenda llena, no.
  if (control.estado === 'caducado') {
    if (campana.isEnabled()) {
      campana.pause();
      avisar('Campaña pausada: el control de agenda no se actualiza',
             'Motivo: ' + control.motivo + '.\n\n' +
             'El guardián ya no sabe si quedan huecos, así que ha parado la campaña ' +
             'para no gastar a ciegas. Suele significar que el ordenador que publica ' +
             'la agenda está apagado, sin red, o que el sistema de reservas ha cambiado.\n\n' +
             'La campaña se reactivará sola en cuanto el control vuelva a publicarse.');
    }
    Logger.log(registro.join(' | ') + ' → pausada por control caducado: ' + control.motivo);
    return;
  }

  if (control.estado === 'pausa') {
    if (campana.isEnabled()) {
      campana.pause();
      avisar('Campaña pausada: agenda llena',
             'La campaña "' + CAMPANA + '" se ha pausado. Motivo: ' + control.motivo);
    }
    Logger.log(registro.join(' | ') + ' → pausada por agenda llena');
    return;
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

  // 3 · Reactivar si vuelve a haber huecos y la campaña estaba pausada
  if (control.estado === 'activa' && !campana.isEnabled()) {
    campana.enable();
    avisar('Campaña reactivada', 'Vuelve a haber huecos: ' + control.motivo);
    Logger.log(registro.join(' | ') + ' → reactivada');
    return;
  }

  Logger.log(registro.join(' | ') + ' → sin cambios');
}

// ─── Publicación de métricas ────────────────────────────────────────────────

/**
 * Vuelca el estado real de la campaña en la hoja, en pares clave/valor, que es
 * lo más fácil de leer para el panel desde el CSV publicado.
 */
function publicarMetricas(campana) {
  if (!HOJA_ID) return;

  var zona = AdsApp.currentAccount().getTimeZone();
  var periodo = campana.getStatsFor(INICIO.replace(/-/g, ''), FIN.replace(/-/g, ''));
  var hoy = campana.getStatsFor('TODAY');
  var control = leerControl();

  var coste = periodo.getCost();
  var clics = periodo.getClicks();

  var filas = [
    ['clave', 'valor'],
    ['actualizado', Utilities.formatDate(new Date(), zona, "yyyy-MM-dd'T'HH:mm")],
    ['estado', campana.isEnabled() ? 'activa' : 'pausada'],
    ['motivo', control.motivo || ''],
    ['control', control.estado],
    ['gastado_periodo', coste.toFixed(2)],
    ['tope_periodo', TOPE_PERIODO.toFixed(2)],
    ['gastado_hoy', hoy.getCost().toFixed(2)],
    ['presupuesto_diario', campana.getBudget().getAmount().toFixed(2)],
    ['clics_periodo', String(clics)],
    ['impresiones_periodo', String(periodo.getImpressions())],
    ['cpc_medio', clics > 0 ? (coste / clics).toFixed(2) : '0.00'],
    ['clics_hoy', String(hoy.getClicks())],
    ['impresiones_hoy', String(hoy.getImpressions())],
    ['inicio', INICIO],
    ['fin', FIN],
    ['gastado_antes', GASTADO_ANTES.toFixed(2)],
    // Deja constancia de que el informe diario salió, sin depender de abrir el
    // correo para comprobarlo.
    ['ultimo_informe', ultimoInforme()]
  ];

  var hoja = SpreadsheetApp.openById(HOJA_ID).getSheets()[0];
  hoja.clear();
  hoja.getRange(1, 1, filas.length, 2).setValues(filas);
}

/** Horas transcurridas desde una marca ISO. Null si no se puede leer. */
function antiguedadEnHoras(marcaIso) {
  if (!marcaIso) return null;
  var t = Date.parse(marcaIso);
  if (isNaN(t)) return null;
  return (new Date().getTime() - t) / 3600000;
}

/**
 * Fecha del último informe enviado. Se deduce de las etiquetas «informe-AAAA-MM-DD»
 * que deja `informeDiarioSiToca`, que son la misma marca que evita repetirlo.
 */
function ultimoInforme() {
  var ultima = '';
  var it = AdsApp.labels().withCondition('Name CONTAINS "informe-"').get();
  while (it.hasNext()) {
    var f = it.next().getName().replace('informe-', '');
    if (f > ultima) ultima = f;
  }
  return ultima || 'ninguno todavía';
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

    // Un control viejo es peor que no tener control: parece válido y no lo es.
    var horas = antiguedadEnHoras(datos.actualizado);
    if (horas === null || horas > MAX_HORAS_CONTROL) {
      return {
        estado: 'caducado',
        presupuesto: 0,
        motivo: horas === null
          ? 'el control no trae fecha'
          : 'el control lleva ' + Math.round(horas) + ' h sin actualizarse'
      };
    }

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

/**
 * Envía el informe una sola vez al día. Usa una etiqueta con la fecha como
 * marca para no repetirlo si el script se ejecuta dos veces en la misma hora.
 */
function informeDiarioSiToca(campana) {
  var zona = AdsApp.currentAccount().getTimeZone();
  var ahora = new Date();
  if (parseInt(Utilities.formatDate(ahora, zona, 'H'), 10) !== HORA_INFORME) return;

  var hoy = Utilities.formatDate(ahora, zona, 'yyyy-MM-dd');
  var marca = 'informe-' + hoy;
  if (AdsApp.labels().withCondition('Name = "' + marca + '"').get().hasNext()) return;
  AdsApp.createLabel(marca, 'Marca interna: informe diario ya enviado');

  var ayer = campana.getStatsFor('YESTERDAY');
  var periodo = campana.getStatsFor(INICIO.replace(/-/g, ''), FIN.replace(/-/g, ''));
  var control = leerControl();

  var l = [];
  l.push('AYER');
  l.push('  Inversión     €' + ayer.getCost().toFixed(2));
  l.push('  Clics         ' + ayer.getClicks());
  l.push('  Impresiones   ' + ayer.getImpressions());
  l.push('  Conversiones  ' + ayer.getConversions());
  l.push('');
  l.push('ACUMULADO ' + INICIO + ' → ' + FIN);
  l.push('  Inversión     €' + periodo.getCost().toFixed(2) + '  de €' + TOPE_PERIODO.toFixed(2));
  l.push('  Restante      €' + Math.max(0, TOPE_PERIODO - periodo.getCost()).toFixed(2));
  l.push('  Clics         ' + periodo.getClicks());
  l.push('  Conversiones  ' + periodo.getConversions());
  l.push('');
  l.push('ESTADO AHORA');
  l.push('  Campaña       ' + (campana.isEnabled() ? 'activa' : 'PAUSADA'));
  l.push('  Presupuesto   €' + campana.getBudget().getAmount().toFixed(2) + '/día');
  l.push('  Agenda        ' + control.motivo);
  l.push('');
  l.push('BÚSQUEDAS QUE MÁS GASTARON AYER');
  l.push(terminosDeAyer());
  l.push('');
  l.push('La pausa por agenda llena es automática, cada hora.');
  l.push('');
  l.push('Panel:  ' + URL_PANEL);
  l.push('Agenda: ' + URL_AGENDA);

  MailApp.sendEmail(EMAIL_AVISOS,
    '[Private Studio · Circuit] Informe ' + Utilities.formatDate(ahora, zona, 'd MMM'),
    l.join('\n'));
}

/** Los diez términos que más gasto generaron ayer, para cazar negativas. */
function terminosDeAyer() {
  var filas = [];
  try {
    var informe = AdsApp.report(
      'SELECT search_term_view.search_term, metrics.clicks, metrics.cost_micros ' +
      'FROM search_term_view WHERE segments.date DURING YESTERDAY ' +
      'AND campaign.name = "' + CAMPANA + '" ' +
      'ORDER BY metrics.cost_micros DESC LIMIT 10');
    var it = informe.rows();
    while (it.hasNext()) {
      var f = it.next();
      filas.push('  ' + f['search_term_view.search_term'] + '  —  ' +
                 f['metrics.clicks'] + ' clics, €' + (f['metrics.cost_micros'] / 1000000).toFixed(2));
    }
  } catch (e) { return '  (no disponibles: ' + e + ')'; }
  return filas.length ? filas.join('\n') : '  (ninguna todavía)';
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
