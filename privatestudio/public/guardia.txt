/**
 * RECONCILIACIÓN DE 30 DÍAS Y DETALLE DE CONVERSIONES — solo lectura
 *
 * Alex pregunta dos cosas de la vista "últimos 30 días" de Google Ads:
 *   1. Si de verdad se han gastado 80,25 €, o el número está inflado.
 *   2. Qué son exactamente las 2 conversiones que aparecen.
 *
 * Sobre lo segundo hay una sospecha concreta: el 1 de agosto se probó la
 * conversión "Clic en Reservar (web)" a mano, en directo, para confirmar que
 * el píxel disparaba. Esa prueba pudo colarse como una conversión real.
 */

var CAMPANA = 'PS | Search | Barcelona';

function main() {
  Logger.log('GASTO POR DÍA (últimos 30 días)');
  Logger.log(gastoPorDia());
  Logger.log('');

  Logger.log('CONVERSIONES: FECHA, HORA Y ORIGEN (últimos 30 días)');
  Logger.log(detalleConversiones());
}

function gastoPorDia() {
  var filas = [];
  var total = 0;
  try {
    var inf = AdsApp.report(
      'SELECT segments.date, metrics.cost_micros, metrics.clicks ' +
      'FROM campaign WHERE segments.date DURING LAST_30_DAYS ' +
      'AND campaign.name = "' + CAMPANA + '" ORDER BY segments.date');
    var it = inf.rows();
    while (it.hasNext()) {
      var f = it.next();
      var coste = f['metrics.cost_micros'] / 1000000;
      total += coste;
      if (coste > 0) {
        filas.push('  ' + f['segments.date'] + '  €' + coste.toFixed(2) +
                   '  (' + f['metrics.clicks'] + ' clics)');
      }
    }
  } catch (e) { return '  (no disponible: ' + e; }
  filas.push('  ─────────────────────');
  filas.push('  TOTAL: €' + total.toFixed(2));
  return filas.join('\n');
}

function detalleConversiones() {
  var filas = [];
  try {
    var inf = AdsApp.report(
      'SELECT segments.date, segments.hour, segments.conversion_action_name, ' +
      'metrics.all_conversions, metrics.conversions_value ' +
      'FROM campaign WHERE segments.date DURING LAST_30_DAYS ' +
      'AND campaign.name = "' + CAMPANA + '" ' +
      'AND metrics.all_conversions > 0 ' +
      'ORDER BY segments.date, segments.hour');
    var it = inf.rows();
    while (it.hasNext()) {
      var f = it.next();
      filas.push('  ' + f['segments.date'] + ' ' + f['segments.hour'] + ':00  —  ' +
                 f['segments.conversion_action_name'] + '  (' +
                 f['metrics.all_conversions'] + ')');
    }
  } catch (e) { return '  (no disponible: ' + e; }
  return filas.length ? filas.join('\n') : '  (ninguna conversión con detalle en el rango)';
}
