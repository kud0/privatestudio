/**
 * CONSULTA DE GASTO POR CAMPAÑA Y DÍA — solo lectura, no cambia nada
 *
 * Alex pregunta de dónde salieron los ~20 € del 31 de julio: de la campaña que
 * ahora llevamos nosotros o de alguna de las que dejó la agencia anterior.
 * La interfaz no deja fijar un rango de un solo día sin pelearse, así que se
 * pregunta directamente.
 *
 * No modifica nada: solo escribe en el log.
 */

var DIAS = ['20260729', '20260730', '20260731', '20260801'];

function main() {
  Logger.log('GASTO POR CAMPAÑA Y DÍA (todas las campañas de la cuenta)');
  Logger.log('');

  for (var d = 0; d < DIAS.length; d++) {
    var dia = DIAS[d];
    var lineas = [];
    var totalDia = 0;

    var it = AdsApp.campaigns().get();
    while (it.hasNext()) {
      var c = it.next();
      var s = c.getStatsFor(dia, dia);
      var coste = s.getCost();
      totalDia += coste;
      if (coste > 0 || s.getImpressions() > 0) {
        lineas.push('    ' + c.getName() + ': €' + coste.toFixed(2) +
                    '  (' + s.getClicks() + ' clics, ' + s.getImpressions() + ' impr.)');
      }
    }

    // Performance Max y otros tipos no salen en AdsApp.campaigns()
    var itP = AdsApp.performanceMaxCampaigns().get();
    while (itP.hasNext()) {
      var p = itP.next();
      var sp = p.getStatsFor(dia, dia);
      var costeP = sp.getCost();
      totalDia += costeP;
      if (costeP > 0 || sp.getImpressions() > 0) {
        lineas.push('    [PMax] ' + p.getName() + ': €' + costeP.toFixed(2) +
                    '  (' + sp.getClicks() + ' clics, ' + sp.getImpressions() + ' impr.)');
      }
    }

    Logger.log(formatearDia(dia) + '  —  TOTAL CUENTA €' + totalDia.toFixed(2));
    Logger.log(lineas.length ? lineas.join('\n') : '    (sin actividad)');
    Logger.log('');
  }

  // Cuándo se cambió el presupuesto a 20 €/día y quién lo hizo
  Logger.log('PRESUPUESTO ACTUAL POR CAMPAÑA');
  var it2 = AdsApp.campaigns().get();
  while (it2.hasNext()) {
    var c2 = it2.next();
    Logger.log('    ' + c2.getName() + ': €' + c2.getBudget().getAmount().toFixed(2) +
               '/día · ' + (c2.isEnabled() ? 'activa' : 'pausada'));
  }
  var it3 = AdsApp.performanceMaxCampaigns().get();
  while (it3.hasNext()) {
    var p3 = it3.next();
    Logger.log('    [PMax] ' + p3.getName() + ': €' + p3.getBudget().getAmount().toFixed(2) +
               '/día · ' + (p3.isEnabled() ? 'activa' : 'pausada'));
  }
}

function formatearDia(d) {
  return d.slice(6, 8) + '/' + d.slice(4, 6);
}
