/**
 * INFORME DIARIO — Circuit Festival 2026 · Private Studio (608-571-5182)
 *
 * Segundo Google Ads Script, independiente del guardián.
 * Programar: "Diariamente", entre las 08:00 y las 08:30.
 *
 * Envía cada mañana un correo con lo de ayer y el acumulado del festival, y
 * termina con la pregunta operativa del día: cuántos huecos quedan. Esa pregunta
 * es la que dispara la decisión de subir, bajar o pausar.
 *
 * Vive dentro de Google Ads a propósito: se ejecuta aunque el portátil esté
 * apagado y aunque nadie tenga sesión abierta en ningún sitio.
 */

var CAMPANA = 'PS | Search | Barcelona';
var INICIO  = '2026-08-01';
var FIN     = '2026-08-15';
var EMAIL   = 'alexsole@gmail.com';

// Enlace directo a la agenda, para resolver la comprobación desde el móvil.
var URL_AGENDA = 'https://booksy.com/es-es/90283_private-studio_barberia_48863_barcelona';
var URL_PANEL  = 'https://www.barberbarcelona.es/panel-76380b752010.html';

function main() {
  var it = AdsApp.campaigns().withCondition('Name = "' + CAMPANA + '"').get();
  if (!it.hasNext()) {
    MailApp.sendEmail(EMAIL, '[Private Studio · Circuit] Informe diario: campaña no encontrada',
      'No existe ninguna campaña llamada "' + CAMPANA + '".');
    return;
  }
  var campana = it.next();

  var ayer = campana.getStatsFor('YESTERDAY');
  var periodo = campana.getStatsFor(INICIO.replace(/-/g, ''), FIN.replace(/-/g, ''));

  var lineas = [];
  lineas.push('AYER');
  lineas.push('  Inversión      €' + ayer.getCost().toFixed(2));
  lineas.push('  Clics          ' + ayer.getClicks());
  lineas.push('  Impresiones    ' + ayer.getImpressions());
  lineas.push('  Conversiones   ' + ayer.getConversions());
  lineas.push('  Coste/conv.    ' + costePorConversion(ayer));
  lineas.push('');
  lineas.push('ACUMULADO 1–15 AGOSTO');
  lineas.push('  Inversión      €' + periodo.getCost().toFixed(2));
  lineas.push('  Clics          ' + periodo.getClicks());
  lineas.push('  Conversiones   ' + periodo.getConversions());
  lineas.push('  Coste/conv.    ' + costePorConversion(periodo));
  lineas.push('');
  lineas.push('ESTADO');
  lineas.push('  Campaña        ' + (campana.isEnabled() ? 'activa' : 'PAUSADA'));
  lineas.push('  Presupuesto    €' + campana.getBudget().getAmount().toFixed(2) + '/día');
  lineas.push('');
  lineas.push('Términos de búsqueda nuevos de ayer:');
  lineas.push(terminosDeAyer(campana));
  lineas.push('');
  lineas.push('─────────────────────────────────────');
  lineas.push('La pausa por agenda llena es automática: la gestiona el guardián');
  lineas.push('cada hora leyendo la disponibilidad real de Booksy.');
  lineas.push('');
  lineas.push('Panel en vivo: ' + URL_PANEL);
  lineas.push('Agenda:        ' + URL_AGENDA);

  MailApp.sendEmail(EMAIL,
    '[Private Studio · Circuit] Informe ' + Utilities.formatDate(
      new Date(), AdsApp.currentAccount().getTimeZone(), 'd MMM'),
    lineas.join('\n'));
}

function costePorConversion(stats) {
  var conv = stats.getConversions();
  return conv > 0 ? '€' + (stats.getCost() / conv).toFixed(2) : '—';
}

/** Los diez términos que más gasto generaron ayer, para cazar negativas. */
function terminosDeAyer(campana) {
  var filas = [];
  try {
    var informe = AdsApp.report(
      'SELECT search_term_view.search_term, metrics.clicks, metrics.cost_micros ' +
      'FROM search_term_view ' +
      'WHERE segments.date DURING YESTERDAY ' +
      'AND campaign.name = "' + CAMPANA + '" ' +
      'ORDER BY metrics.cost_micros DESC LIMIT 10');
    var filasIt = informe.rows();
    while (filasIt.hasNext()) {
      var f = filasIt.next();
      var coste = (f['metrics.cost_micros'] / 1000000).toFixed(2);
      filas.push('  ' + f['search_term_view.search_term'] +
                 '  —  ' + f['metrics.clicks'] + ' clics, €' + coste);
    }
  } catch (e) {
    return '  (no disponibles: ' + e + ')';
  }
  return filas.length ? filas.join('\n') : '  (ninguno todavía)';
}
