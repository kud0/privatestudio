/**
 * LIMPIEZA DEL SOLAPAMIENTO ES/EN — ejecución única
 *
 * El script de estructura anterior creó bien el grupo «EN — Barber», pero la
 * lista de keywords inglesas a pausar en el grupo español la escribí a mano
 * desde una lectura parcial de la tabla y se quedó corta. Resultado: «haircut
 * barcelona», «english speaking barber» y «mens haircut barcelona» siguen
 * activas en los dos grupos a la vez, compitiendo entre ellas.
 *
 * En vez de otra lista a mano, aquí la detección es automática: se pausa en el
 * grupo español toda keyword que contenga una palabra inglesa o alemana. El
 * grupo español se queda solo con castellano.
 *
 * Al final vuelca el inventario completo de ambos grupos con su estado, para
 * poder verificar sin depender de la paginación de la interfaz.
 */

var CAMPANA = 'PS | Search | Barcelona';
var GRUPO_EN = 'EN — Barber';
var GRUPO_ES = 'ES — Barbería';

// Palabras que delatan que la keyword no es castellano. Se comparan como
// palabra completa sobre el texto sin acentos, así «barberia» y «barbería» no
// se confunden con «barber».
var PALABRAS_NO_ES = ['barber', 'barbershop', 'barbers', 'haircut', 'haircuts',
  'shop', 'shops', 'hair', 'cut', 'beard', 'trim', 'speaking', 'english',
  'near', 'me', 'mens', 'men', 'friseur', 'nahe', 'meiner', 'in', 'shave',
  'grooming', 'best', 'book', 'booking', 'appointment'];

function main() {
  var it = AdsApp.campaigns().withCondition('Name = "' + CAMPANA + '"').get();
  if (!it.hasNext()) { Logger.log('ERROR: campaña no encontrada'); return; }
  var campana = it.next();

  var grupoES = buscarGrupo(campana, GRUPO_ES);
  var grupoEN = buscarGrupo(campana, GRUPO_EN);
  if (!grupoES) { Logger.log('ERROR: no existe "' + GRUPO_ES + '"'); return; }

  // 1 · Pausar en el grupo español todo lo que no sea castellano
  var pausadas = [];
  var itES = grupoES.keywords().get();
  while (itES.hasNext()) {
    var kw = itES.next();
    if (!kw.isEnabled()) continue;
    if (esNoCastellano(kw.getText())) { kw.pause(); pausadas.push(kw.getText()); }
  }

  // 2 · Inventario completo, que la interfaz pagina de diez en diez
  Logger.log('PAUSADAS AHORA EN ES (' + pausadas.length + '): ' + pausadas.join(' | '));
  Logger.log('');
  Logger.log(inventario(grupoES, GRUPO_ES));
  Logger.log('');
  Logger.log(inventario(grupoEN, GRUPO_EN));
  Logger.log('');
  Logger.log(anuncios(grupoEN, GRUPO_EN));
  Logger.log(anuncios(grupoES, GRUPO_ES));
  Logger.log('');
  Logger.log(negativas(campana));
}

/** Verdadero si alguna palabra del texto está en la lista no castellana. */
function esNoCastellano(texto) {
  var limpio = String(texto)
    .replace(/["\[\]+]/g, ' ')
    .toLowerCase()
    .replace(/[áàä]/g, 'a').replace(/[éèë]/g, 'e').replace(/[íìï]/g, 'i')
    .replace(/[óòö]/g, 'o').replace(/[úùü]/g, 'u').replace(/ñ/g, 'n');
  var palabras = limpio.split(/[^a-z0-9']+/).filter(function (p) { return p; });
  for (var i = 0; i < palabras.length; i++) {
    for (var j = 0; j < PALABRAS_NO_ES.length; j++) {
      if (palabras[i] === PALABRAS_NO_ES[j]) return true;
    }
  }
  return false;
}

function inventario(grupo, nombre) {
  if (!grupo) return nombre + ': NO EXISTE';
  var activas = [], paradas = [];
  var it = grupo.keywords().get();
  while (it.hasNext()) {
    var k = it.next();
    (k.isEnabled() ? activas : paradas).push(k.getText());
  }
  return nombre + '\n  ACTIVAS (' + activas.length + '): ' + activas.join(' | ') +
         '\n  PAUSADAS (' + paradas.length + '): ' + paradas.join(' | ');
}

function anuncios(grupo, nombre) {
  if (!grupo) return nombre + ' anuncios: grupo inexistente';
  var n = 0, urls = [];
  var it = grupo.ads().get();
  while (it.hasNext()) {
    var a = it.next();
    n++;
    urls.push((a.isEnabled() ? 'activo' : 'parado') + ' → ' + a.urls().getFinalUrl());
  }
  return nombre + ' anuncios: ' + n + ' [' + urls.join(', ') + ']';
}

function negativas(campana) {
  var lista = [];
  var it = campana.negativeKeywords().get();
  while (it.hasNext()) lista.push(it.next().getText());
  return 'NEGATIVAS DE CAMPAÑA (' + lista.length + '): ' + lista.join(' | ');
}

function buscarGrupo(campana, nombre) {
  var it = campana.adGroups().withCondition('Name = "' + nombre + '"').get();
  return it.hasNext() ? it.next() : null;
}
