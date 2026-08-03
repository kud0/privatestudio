/**
 * QUÉ HA PASADO HOY — solo lectura, no cambia nada
 *
 * Alex dice que hoy se ha gastado dinero y no se ha llenado ningún hueco de
 * mañana. La agenda dice que sí se han llenado cuatro. Este script trae los
 * datos de Google Ads para poder cerrar la discusión con hechos:
 *
 *   · Qué se ha gastado y qué se ha conseguido hoy.
 *   · Cuántos de esos clics acabaron pulsando «Reservar» en la web.
 *   · A qué horas se está gastando, ahora que la franja empieza a las 9:00.
 *   · Qué búsquedas se están pagando hoy.
 */

var CAMPANA = 'PS | Search | Barcelona';

function main() {
  var it = AdsApp.campaigns().withCondition('Name = "' + CAMPANA + '"').get();
  if (!it.hasNext()) { Logger.log('ERROR: campaña no encontrada'); return; }
  var campana = it.next();

  var hoy = campana.getStatsFor('TODAY');
  Logger.log('HOY');
  Logger.log('  Inversión     €' + hoy.getCost().toFixed(2));
  Logger.log('  Clics         ' + hoy.getClicks());
  Logger.log('  Impresiones   ' + hoy.getImpressions());
  Logger.log('  Conversiones  ' + hoy.getConversions());
  Logger.log('');

  Logger.log('CONVERSIONES DE HOY POR TIPO');
  Logger.log(porAccion());
  Logger.log('');

  Logger.log('POR HORA DE HOY (la franja nueva empieza a las 9)');
  Logger.log(porHora());
  Logger.log('');

  Logger.log('BÚSQUEDAS PAGADAS HOY');
  Logger.log(terminos());
}

function porAccion() {
  var filas = [];
  try {
    var inf = AdsApp.report(
      'SELECT segments.conversion_action_name, metrics.all_conversions, metrics.conversions ' +
      'FROM campaign WHERE segments.date DURING TODAY ' +
      'AND campaign.name = "' + CAMPANA + '"');
    var it = inf.rows();
    while (it.hasNext()) {
      var f = it.next();
      filas.push('  ' + f['segments.conversion_action_name'] +
                 ': ' + f['metrics.all_conversions'] + ' (principales: ' + f['metrics.conversions'] + ')');
    }
  } catch (e) { return '  (no disponible: ' + e + ')'; }
  return filas.length ? filas.join('\n') : '  NINGUNA conversión registrada hoy';
}

function porHora() {
  var filas = [];
  try {
    var inf = AdsApp.report(
      'SELECT segments.hour, metrics.clicks, metrics.impressions, metrics.cost_micros ' +
      'FROM campaign WHERE segments.date DURING TODAY ' +
      'AND campaign.name = "' + CAMPANA + '" ORDER BY segments.hour');
    var it = inf.rows();
    while (it.hasNext()) {
      var f = it.next();
      var c = Number(f['metrics.clicks']);
      filas.push('  ' + String(f['segments.hour']).padStart ?
        ('  ' + f['segments.hour'] + 'h  ' + c + ' clics · ' +
         f['metrics.impressions'] + ' impr · €' + (f['metrics.cost_micros'] / 1000000).toFixed(2)) :
        ('  ' + f['segments.hour'] + 'h  ' + c + ' clics'));
    }
  } catch (e) { return '  (no disponible: ' + e + ')'; }
  return filas.length ? filas.join('\n') : '  (sin datos por hora todavía)';
}

function terminos() {
  var filas = [];
  try {
    var inf = AdsApp.report(
      'SELECT search_term_view.search_term, metrics.clicks, metrics.cost_micros ' +
      'FROM search_term_view WHERE segments.date DURING TODAY ' +
      'AND campaign.name = "' + CAMPANA + '" ' +
      'ORDER BY metrics.cost_micros DESC LIMIT 25');
    var it = inf.rows();
    while (it.hasNext()) {
      var f = it.next();
      filas.push('  ' + f['search_term_view.search_term'] + '  —  ' +
                 f['metrics.clicks'] + ' clics, €' + (f['metrics.cost_micros'] / 1000000).toFixed(2));
    }
  } catch (e) { return '  (no disponible: ' + e + ')'; }
  return filas.length ? filas.join('\n') : '  (Google aún no ha publicado los términos de hoy)';
}
