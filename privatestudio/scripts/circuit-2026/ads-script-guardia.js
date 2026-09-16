/**
 * GUARDIÁN — Private Studio Search (608-571-5182)
 * Campaña: PS | Search | Barcelona
 *
 * Google Ads Script. Corre DENTRO de la cuenta, cada hora, sin que nadie
 * tenga sesión abierta. El presupuesto diario nativo de Google no es de
 * fiar (se pasa y "compensa" en el mes): este script pausa al llegar al
 * 100 % del día. El horario 9–19 va por partida doble: ad schedule nativo
 * (corta el serving al instante) + pause/enable aquí (por si el schedule
 * se borra o Google lo ignora).
 *
 * Cada hora:
 *   1. Fuera de 9–19 (Europe/Madrid) → pausa. Dentro → puede activar.
 *   2. Agenda Booksy: si CONTROL_URL dice pausa, pausa.
 *   3. Gasto de HOY >= presupuesto diario → pausa hasta mañana.
 *   4. Ad schedule nativo: todos los días 9:00–19:00. Lo repara si falta.
 *
 * Ante fallo de red / control ilegible: no pausa por agenda. Sí respeta
 * horario y tope diario (eso no depende del control).
 *
 * Instalación: Herramientas → Acciones masivas → Scripts.
 * Pegar · Autorizar · Programar: Cada hora.
 */

// ─── Configuración ──────────────────────────────────────────────────────────

var CAMPANA = 'PS | Search | Barcelona';   // campaignId 22697186771

// Ventana de stats / fecha de fin de campaña. Tope de PERIODO desactivado
// (0): esto ya no es Circuit 1–15 ago. El freno de dinero es el diario.
var TOPE_PERIODO = 0;
var GASTADO_ANTES = 19.99;
var INICIO = '2026-08-27';
var FIN    = '2027-12-31';

// 9:00 inclusive → 19:00 exclusive. A las 19:00 ya está pausada.
var HORA_INICIO = 9;
var HORA_FIN    = 19;

// 1.0 = al llegar al presupuesto del día, para. Sin el 15 % extra que
// Google se permite. Los datos llegan con minutos de retraso: entre
// dos ejecuciones horarias aún puede colarse un clic de más. Por eso
// el ad schedule nativo también corta a las 19:00.
var MARGEN_DIARIO = 1.0;

var CONTROL_URL = 'https://www.barberbarcelona.es/api/circuit-control';
var REFRESH_URL = 'https://www.barberbarcelona.es/api/circuit-refresh';
var REFRESH_SECRET = 'REEMPLAZAR_CON_EL_CRON_SECRET';
var MAX_HORAS_CONTROL = 14;

var EMAIL_AVISOS = 'alexsole@gmail.com';
var UMBRAL_AVISO = 0.8;
var HORA_INFORME = 8;

var URL_PANEL  = 'https://ps-ads-seven.vercel.app';
var URL_AGENDA = 'https://booksy.com/es-es/90283_private-studio_barberia_48863_barcelona';
var HOJA_ID = '16n-xk77i2ep7Vk5HKxbm8QEvme-RcIhcnm-vC5i6uf0';

var DIAS_SEMANA = [
  'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY',
  'FRIDAY', 'SATURDAY', 'SUNDAY'
];

// ─── Ejecución ──────────────────────────────────────────────────────────────

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
    dispararRefrescoHistorico();
  }
}

function proteger(campana) {
  var registro = [];
  var zona = AdsApp.currentAccount().getTimeZone();
  var ahora = new Date();
  var hoyIso = Utilities.formatDate(ahora, zona, 'yyyy-MM-dd');
  var hora = parseInt(Utilities.formatDate(ahora, zona, 'H'), 10);
  registro.push('hora=' + hora);

  informeDiarioSiToca(campana);

  try {
    registro.push(aplicarHorarioNativo(campana));
  } catch (e) {
    Logger.log('ad schedule nativo: ' + e);
    registro.push('horario-nativo=error');
  }

  if (hoyIso > FIN) {
    if (campana.isEnabled()) {
      campana.pause();
      avisar('Campaña pausada: fin de fecha',
             'Hoy es ' + hoyIso + ' y la fecha de fin es ' + FIN + '.\n\n' +
             'La campaña queda pausada.');
    }
    Logger.log('fuera de fecha (' + hoyIso + ' > ' + FIN + ') → pausada');
    return;
  }

  // Horario 9–19. Pausa de noche / madrugada sin email (es rutinario).
  if (hora < HORA_INICIO || hora >= HORA_FIN) {
    if (campana.isEnabled()) campana.pause();
    Logger.log(registro.join(' | ') + ' → pausada por horario (9–19)');
    return;
  }

  var control = leerControl();
  registro.push('control=' + control.estado);

  if (control.estado === 'caducado') {
    if (campana.isEnabled()) {
      campana.pause();
      avisar('Campaña pausada: el control de agenda no se actualiza',
             'Motivo: ' + control.motivo + '.\n\n' +
             'El guardián ya no sabe si quedan huecos, así que ha parado la campaña.');
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

  var gastado = gastoPeriodo(campana);
  registro.push('gastado=' + gastado.toFixed(2));

  if (TOPE_PERIODO > 0 && gastado >= TOPE_PERIODO) {
    if (campana.isEnabled()) {
      campana.pause();
      avisar('Campaña pausada: tope de periodo alcanzado',
             'Gasto acumulado del periodo: €' + gastado.toFixed(2) +
             '. Tope configurado: €' + TOPE_PERIODO.toFixed(2) + '.');
    }
    Logger.log(registro.join(' | ') + ' → pausada por tope de periodo');
    return;
  }

  if (TOPE_PERIODO > 0 && gastado >= TOPE_PERIODO * UMBRAL_AVISO && !avisoYaEnviado()) {
    avisar('Aviso: ' + Math.round(UMBRAL_AVISO * 100) + '% del presupuesto de periodo',
           'Gasto acumulado: €' + gastado.toFixed(2) + ' de €' + TOPE_PERIODO.toFixed(2) + '.');
    marcarAvisoEnviado();
  }

  var diario = campana.getBudget().getAmount();
  var gastadoHoy = campana.getStatsFor('TODAY').getCost();
  registro.push('hoy=' + gastadoHoy.toFixed(2) + '/' + diario.toFixed(2));

  if (diario > 0 && gastadoHoy >= diario * MARGEN_DIARIO) {
    if (campana.isEnabled()) {
      campana.pause();
      avisar('Campaña pausada: presupuesto del día agotado',
             'Hoy lleva €' + gastadoHoy.toFixed(2) + ' con un presupuesto de €' +
             diario.toFixed(2) + '/día.\n\n' +
             'Google se permite pasarse del importe diario. El guardián la para ' +
             'al 100 % y la vuelve a abrir mañana a las ' + HORA_INICIO + ':00.\n\n' +
             'Panel: ' + URL_PANEL);
    }
    Logger.log(registro.join(' | ') + ' → pausada por tope del día');
    return;
  }

  // Dentro de 9–19, bajo presupuesto, agenda no en pausa.
  // control=auto (fetch fallido) también activa: no dejarla muerta
  // toda la mañana porque Booksy no contestó. Ya salimos si era pausa/caducado.
  if (!campana.isEnabled()) {
    campana.enable();
    Logger.log(registro.join(' | ') + ' → activada (horario ' + HORA_INICIO + '–' + HORA_FIN + ')');
    return;
  }

  Logger.log(registro.join(' | ') + ' → sin cambios');
}

/**
 * Corta el serving a las 19:00 aunque el script tarde hasta :59 en correr.
 * Si ya hay exactamente 7 franjas 9:00–19:00, no toca nada.
 */
function aplicarHorarioNativo(campana) {
  var porDia = {};
  var it = campana.targeting().adSchedules().get();
  while (it.hasNext()) {
    var s = it.next();
    var dia = String(s.getDayOfWeek()).toUpperCase();
    var ok = s.getStartHour() === HORA_INICIO && s.getStartMinute() === 0 &&
             s.getEndHour() === HORA_FIN && s.getEndMinute() === 0;
    if (ok && !porDia[dia]) porDia[dia] = s;
    else s.remove();
  }
  var anadidos = 0;
  var i;
  for (i = 0; i < DIAS_SEMANA.length; i++) {
    if (porDia[DIAS_SEMANA[i]]) continue;
    campana.addAdSchedule({
      dayOfWeek: DIAS_SEMANA[i],
      startHour: HORA_INICIO,
      startMinute: 0,
      endHour: HORA_FIN,
      endMinute: 0,
      bidModifier: 1
    });
    anadidos++;
  }
  if (anadidos === 0) return 'horario-nativo=9-' + HORA_FIN + ' ok x' + DIAS_SEMANA.length;
  return 'horario-nativo=anadidos ' + anadidos;
}

// ─── Publicación de métricas ────────────────────────────────────────────────

function publicarMetricas(campana) {
  if (!HOJA_ID) return;

  var zona = AdsApp.currentAccount().getTimeZone();
  var periodo = campana.getStatsFor(INICIO.replace(/-/g, ''), FIN.replace(/-/g, ''));
  var hoy = campana.getStatsFor('TODAY');
  var control = leerControl();
  var hora = parseInt(Utilities.formatDate(new Date(), zona, 'H'), 10);

  var coste = periodo.getCost();
  var clics = periodo.getClicks();
  var mes = campana.getStatsFor('THIS_MONTH');

  var filas = [
    ['clave', 'valor'],
    ['actualizado', Utilities.formatDate(new Date(), zona, "yyyy-MM-dd'T'HH:mm")],
    ['estado', campana.isEnabled() ? 'activa' : 'pausada'],
    ['motivo', control.motivo || ''],
    ['control', control.estado],
    ['gastado_periodo', coste.toFixed(2)],
    ['tope_periodo', TOPE_PERIODO.toFixed(2)],
    ['gastado_hoy', hoy.getCost().toFixed(2)],
    ['gastado_mes', mes.getCost().toFixed(2)],
    ['clics_mes', String(mes.getClicks())],
    ['impresiones_mes', String(mes.getImpressions())],
    ['presupuesto_diario', campana.getBudget().getAmount().toFixed(2)],
    ['margen_diario', String(MARGEN_DIARIO)],
    ['horario', HORA_INICIO + '-' + HORA_FIN],
    ['hora_madrid', String(hora)],
    ['clics_periodo', String(clics)],
    ['impresiones_periodo', String(periodo.getImpressions())],
    ['cpc_medio', clics > 0 ? (coste / clics).toFixed(2) : '0.00'],
    ['clics_hoy', String(hoy.getClicks())],
    ['impresiones_hoy', String(hoy.getImpressions())],
    ['inicio', INICIO],
    ['fin', FIN],
    ['gastado_antes', GASTADO_ANTES.toFixed(2)],
    ['ultimo_informe', ultimoInforme()]
  ];

  var hoja = SpreadsheetApp.openById(HOJA_ID).getSheets()[0];
  hoja.clear();
  hoja.getRange(1, 1, filas.length, 2).setValues(filas);
}

function antiguedadEnHoras(marcaIso) {
  if (!marcaIso) return null;
  var t = Date.parse(marcaIso);
  if (isNaN(t)) return null;
  return (new Date().getTime() - t) / 3600000;
}

function ultimoInforme() {
  var ultima = '';
  var it = AdsApp.labels().withCondition('Name CONTAINS "informe-"').get();
  while (it.hasNext()) {
    var f = it.next().getName().replace('informe-', '');
    if (f > ultima) ultima = f;
  }
  return ultima || 'ninguno todavía';
}

function buscarCampana(nombre) {
  var it = AdsApp.campaigns().withCondition('Name = "' + nombre + '"').get();
  return it.hasNext() ? it.next() : null;
}

function gastoPeriodo(campana) {
  var desde = INICIO.replace(/-/g, '');
  var hasta = FIN.replace(/-/g, '');
  return campana.getStatsFor(desde, hasta).getCost();
}

function dispararRefrescoHistorico() {
  if (!REFRESH_URL || REFRESH_SECRET === 'REEMPLAZAR_CON_EL_CRON_SECRET') return;
  try {
    UrlFetchApp.fetch(REFRESH_URL, {
      method: 'get',
      headers: { Authorization: 'Bearer ' + REFRESH_SECRET },
      muteHttpExceptions: true
    });
  } catch (e) {
    Logger.log('refresco de historico fallido (no crítico): ' + e);
  }
}

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
    Logger.log('Control ilegible (' + e + '). No se toca nada por agenda.');
    return vacio;
  }
}

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
  l.push('DESDE ' + INICIO);
  l.push('  Inversión     €' + periodo.getCost().toFixed(2));
  l.push('  Clics         ' + periodo.getClicks());
  l.push('  Conversiones  ' + periodo.getConversions());
  l.push('');
  l.push('ESTADO AHORA');
  l.push('  Campaña       ' + (campana.isEnabled() ? 'activa' : 'PAUSADA'));
  l.push('  Presupuesto   €' + campana.getBudget().getAmount().toFixed(2) + '/día');
  l.push('  Horario       ' + HORA_INICIO + ':00–' + HORA_FIN + ':00 (pausa al 100 % del día)');
  l.push('  Agenda        ' + control.motivo);
  l.push('');
  l.push('BÚSQUEDAS QUE MÁS GASTARON AYER');
  l.push(terminosDeAyer());
  l.push('');
  l.push('Panel:  ' + URL_PANEL);
  l.push('Agenda: ' + URL_AGENDA);

  MailApp.sendEmail(EMAIL_AVISOS,
    '[Private Studio · Ads] Informe ' + Utilities.formatDate(ahora, zona, 'd MMM'),
    l.join('\n'));
}

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
    '[Private Studio · Ads] ' + asunto,
    cuerpo + '\n\nCuenta 608-571-5182 · campaña "' + CAMPANA + '"' +
    '\nGenerado por el guardián automático el ' + new Date());
}

function avisoYaEnviado() {
  var etiqueta = AdsApp.labels().withCondition('Name = "aviso-80-enviado"').get();
  return etiqueta.hasNext();
}

function marcarAvisoEnviado() {
  AdsApp.createLabel('aviso-80-enviado', 'Marca interna del guardián: aviso de 80% ya enviado');
}
