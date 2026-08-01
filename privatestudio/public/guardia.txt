/**
 * ESTRUCTURA DE CAMPAÑA — ejecución única
 *
 * Hace por código lo que la interfaz de Google Ads no dejó guardar:
 *
 *   1. Crea el ad group «EN — Barber» y le pone las keywords en inglés.
 *   2. Le crea un anuncio responsive en inglés que aterriza en /?lang=en.
 *   3. Mueve las keywords inglesas que hoy conviven con las españolas en
 *      «Gruppo di annunci 1»: las pausa allí para que no compitan.
 *   4. Renombra el ad group original a «ES — Barbería».
 *   5. Añade las negativas del plan a nivel de campaña.
 *
 * Por qué separar idiomas: con ES y EN mezclados, el anuncio nunca encaja del
 * todo con lo que la persona buscó y Google baja el nivel de calidad. Ya se
 * nota — «barberia cerca de mi» está marcada como "se muestra pocas veces".
 *
 * Es idempotente: si el ad group o la keyword ya existen, no los duplica.
 * Se ejecuta una vez y se retira; el guardián vuelve a su sitio después.
 */

var CAMPANA = 'PS | Search | Barcelona';
var GRUPO_EN = 'EN — Barber';
var GRUPO_ES_NUEVO = 'ES — Barbería';
var GRUPO_ORIGINAL = 'Gruppo di annunci 1';

var URL_EN = 'https://www.barberbarcelona.es/?lang=en';
var CPC_MAX = 1.20;

// Keywords en inglés. Concordancia de frase: control del gasto sin cerrarse
// a variantes razonables.
var KEYWORDS_EN = [
  '"barber barcelona"',
  '"barbershop barcelona"',
  '"haircut barcelona"',
  '"mens haircut barcelona"',
  '"beard trim barcelona"',
  '"english speaking barber"',
  '"barber eixample"',
  '"barber near me"'
];

// Las que ya viven en el grupo mezclado y hay que apagar allí para que no
// compitan contra las mismas keywords en el grupo nuevo.
var EN_A_PAUSAR_EN_ES = ['barber', 'barbershop', 'barber near me',
                         'barber shop barber shop', 'friseur in meiner nähe'];

var NEGATIVAS = [
  'empleo', 'trabajo', 'job', 'vacante', 'curso', 'course', 'academy',
  'formación', 'barato', 'cheap', 'free', 'gratis', 'mujer', 'women',
  'ladies', 'domicilio', 'madrid', 'valencia', 'sevilla', 'tutorial',
  'how to cut', 'maquinilla', 'productos'
];

var TITULARES_EN = [
  'Premium Barber Barcelona', "Men's Haircut in Eixample", 'Book Online in Minutes',
  'Cut & Beard Specialists', 'Muntaner 172 · Eixample', 'Look Sharp This Weekend',
  'Beard Trim & Brows', 'Face-Shape Consulting', 'Private Studio Barcelona',
  'Walkable From Your Hotel', 'Open Monday to Saturday'
];

var DESCRIPCIONES_EN = [
  "Premium men's grooming in Eixample. Book online in two minutes.",
  'Haircut, beard and brows by image consultants. Muntaner 172, Barcelona.',
  'Look your best this week in Barcelona. Online booking available.',
  'Your barber in central Barcelona. Limited slots — book now.'
];

function main() {
  var it = AdsApp.campaigns().withCondition('Name = "' + CAMPANA + '"').get();
  if (!it.hasNext()) { Logger.log('ERROR: campaña no encontrada'); return; }
  var campana = it.next();
  var hecho = [];

  // 1 · Ad group en inglés
  var grupoEN = buscarGrupo(campana, GRUPO_EN);
  if (!grupoEN) {
    var op = campana.newAdGroupBuilder()
      .withName(GRUPO_EN)
      .withCpc(CPC_MAX)
      .withStatus('ENABLED')
      .build();
    if (!op.isSuccessful()) { Logger.log('ERROR creando grupo: ' + op.getErrors()); return; }
    grupoEN = op.getResult();
    hecho.push('grupo "' + GRUPO_EN + '" creado');
  } else {
    hecho.push('grupo "' + GRUPO_EN + '" ya existía');
  }

  // 2 · Keywords inglesas en su grupo
  var existentes = {};
  var kit = grupoEN.keywords().get();
  while (kit.hasNext()) existentes[normalizar(kit.next().getText())] = true;

  var nuevas = 0;
  for (var i = 0; i < KEYWORDS_EN.length; i++) {
    if (existentes[normalizar(KEYWORDS_EN[i])]) continue;
    var k = grupoEN.newKeywordBuilder().withText(KEYWORDS_EN[i]).build();
    if (k.isSuccessful()) nuevas++;
    else Logger.log('  no se pudo añadir ' + KEYWORDS_EN[i] + ': ' + k.getErrors());
  }
  hecho.push(nuevas + ' keywords EN añadidas');

  // 3 · Anuncio en inglés
  if (!grupoEN.ads().get().hasNext()) {
    var anuncio = grupoEN.newAd().responsiveSearchAdBuilder()
      .withHeadlines(TITULARES_EN.slice(0, 15))
      .withDescriptions(DESCRIPCIONES_EN.slice(0, 4))
      .withFinalUrl(URL_EN)
      .build();
    hecho.push(anuncio.isSuccessful() ? 'anuncio EN creado'
                                      : 'ERROR anuncio: ' + anuncio.getErrors());
  } else {
    hecho.push('el grupo EN ya tenía anuncio');
  }

  // 4 · Apagar las inglesas del grupo mezclado
  var grupoES = buscarGrupo(campana, GRUPO_ORIGINAL) || buscarGrupo(campana, GRUPO_ES_NUEVO);
  var pausadas = 0;
  if (grupoES) {
    var it2 = grupoES.keywords().get();
    while (it2.hasNext()) {
      var kw = it2.next();
      var txt = normalizar(kw.getText());
      for (var j = 0; j < EN_A_PAUSAR_EN_ES.length; j++) {
        if (txt === EN_A_PAUSAR_EN_ES[j] && kw.isEnabled()) { kw.pause(); pausadas++; break; }
      }
    }
    if (grupoES.getName() === GRUPO_ORIGINAL) {
      grupoES.setName(GRUPO_ES_NUEVO);
      hecho.push('grupo original renombrado a "' + GRUPO_ES_NUEVO + '"');
    }
  }
  hecho.push(pausadas + ' keywords EN pausadas en el grupo español');

  // 5 · Negativas de campaña
  var yaNegativas = {};
  var nit = campana.negativeKeywords().get();
  while (nit.hasNext()) yaNegativas[normalizar(nit.next().getText())] = true;
  var negAdd = 0;
  for (var n = 0; n < NEGATIVAS.length; n++) {
    if (yaNegativas[normalizar(NEGATIVAS[n])]) continue;
    campana.createNegativeKeyword(NEGATIVAS[n]);
    negAdd++;
  }
  hecho.push(negAdd + ' negativas añadidas');

  Logger.log('RESULTADO:\n  ' + hecho.join('\n  '));
}

function buscarGrupo(campana, nombre) {
  var it = campana.adGroups().withCondition('Name = "' + nombre + '"').get();
  return it.hasNext() ? it.next() : null;
}

/** Quita comillas, corchetes y mayúsculas para comparar keywords. */
function normalizar(texto) {
  return String(texto).replace(/["\[\]+]/g, '').trim().toLowerCase();
}
