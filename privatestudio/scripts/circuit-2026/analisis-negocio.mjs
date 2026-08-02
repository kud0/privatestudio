#!/usr/bin/env node
/**
 * ANÁLISIS DE UNA BARBERÍA A PARTIR DE SU AGENDA
 *
 * Lee el histórico de snapshots y responde a las preguntas que deciden si tiene
 * sentido anunciar un negocio de cita previa, y cómo:
 *
 *   · ¿Se llena sola la agenda o hace falta ayuda?
 *   · ¿Con cuánta antelación reserva la gente? (define qué días vale la pena
 *     anunciar y cuáles son ruido)
 *   · ¿Qué días de la semana flojean?
 *   · ¿Qué franjas horarias quedan vacías?
 *   · ¿Cuánto se cancela? (un día "lleno" puede reabrirse)
 *
 * No es específico de Private Studio: cualquier barbería con este mismo
 * histórico se analiza igual. La idea es que llevar la segunda cueste una tarde
 * y no un mes.
 *
 * Uso:  node analisis-negocio.mjs [ruta-al-historico.jsonl]
 */

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const FICHERO = process.argv[2] ?? join(AQUI, 'agenda-historico.jsonl');

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

// Umbral por debajo del cual una muestra no aguanta una conclusión. Con menos,
// se dice "faltan datos" en vez de inventar una cifra con dos decimales.
const MINIMO_PARA_CONCLUIR = 30;

const barra = (n, max, ancho = 34) =>
  '█'.repeat(Math.max(0, Math.round((n / (max || 1)) * ancho)));

const titulo = t => console.log(`\n\x1b[1m${t}\x1b[0m\n${'─'.repeat(t.length)}`);

async function main() {
  let lineas;
  try {
    lineas = (await readFile(FICHERO, 'utf8')).trim().split('\n').filter(Boolean);
  } catch {
    console.error(`No se puede leer ${FICHERO}`);
    process.exit(1);
  }

  const todas = lineas.map(l => JSON.parse(l));

  // Solo se comparan snapshots del mismo rango de fechas: si cambia la ventana,
  // los totales no son comparables (más días = más huecos, no menos reservas).
  const ventanas = [...new Set(todas.map(s => s.ventana).filter(Boolean))];
  const ventana = ventanas.at(-1);
  const muestras = todas.filter(s => s.ventana === ventana);

  if (muestras.length < 2) {
    console.error('Hacen falta al menos dos snapshots de la misma ventana.');
    process.exit(1);
  }

  const desde = new Date(muestras[0].momento);
  const hasta = new Date(muestras.at(-1).momento);
  const horas = (hasta - desde) / 3600000;

  console.log(`\x1b[1mAGENDA · ventana ${ventana}\x1b[0m`);
  console.log(`${muestras.length} muestras · ${horas.toFixed(1)} h observadas`);

  reservasYCancelaciones(muestras, horas);
  antelacion(muestras);
  porDiaDeSemana(muestras);
  porFranja(muestras);
  seLlenaSola(muestras, horas);
}

/** Movimiento bruto de la agenda: cuánto entra y cuánto se cae. */
function reservasYCancelaciones(muestras, horas) {
  let reservadas = 0, liberadas = 0;
  for (const [a, b] of pares(muestras)) {
    for (const dia of diasDe(a, b)) {
      const delta = (a.porDia[dia] ?? 0) - (b.porDia[dia] ?? 0);
      if (delta > 0) reservadas += delta; else liberadas += -delta;
    }
  }
  titulo('MOVIMIENTO DE LA AGENDA');
  console.log(`  Citas reservadas      ${reservadas}`);
  console.log(`  Huecos que se liberan ${liberadas}  (cancelaciones o cambios)`);
  if (reservadas > 0) {
    const tasa = (liberadas / reservadas) * 100;
    console.log(`  Por cada 10 reservas se caen ${(tasa / 10).toFixed(1)}`);
    console.log(`\n  Ritmo neto: ${((reservadas - liberadas) / horas * 24).toFixed(1)} citas/día`);
  }
}

/**
 * La métrica que más decide: si la gente reserva para pasado mañana, anunciar
 * huecos de dentro de dos semanas es tirar el dinero.
 */
function antelacion(muestras) {
  const cuenta = {};
  let total = 0;
  for (const [a, b] of pares(muestras)) {
    const dia = a.momento.slice(0, 10);
    for (const f of diasDe(a, b)) {
      const delta = (a.porDia[f] ?? 0) - (b.porDia[f] ?? 0);
      if (delta <= 0) continue;
      const dias = Math.round((Date.parse(f) - Date.parse(dia)) / 86400000);
      if (dias < 0) continue;
      cuenta[dias] = (cuenta[dias] ?? 0) + delta;
      total += delta;
    }
  }

  titulo('CON CUÁNTA ANTELACIÓN SE RESERVA');
  if (!total) return console.log('  (todavía sin reservas observadas)');

  const max = Math.max(...Object.values(cuenta));
  let acumulado = 0;
  const claves = Object.keys(cuenta).map(Number).sort((x, y) => x - y);
  for (const d of claves) {
    acumulado += cuenta[d];
    const etiqueta = d === 0 ? 'mismo día' : d === 1 ? 'día siguiente' : `${d} días antes`;
    console.log(`  ${etiqueta.padEnd(15)} ${barra(cuenta[d], max).padEnd(35)} ${String(cuenta[d]).padStart(3)}  ${(acumulado / total * 100).toFixed(0)}%`);
  }

  const mitad = claves.find(d => sumaHasta(cuenta, claves, d) >= total / 2);
  const nueveDeCada = claves.find(d => sumaHasta(cuenta, claves, d) >= total * 0.9);
  console.log(`\n  La mitad de las reservas entran con ${mitad} día(s) o menos de antelación.`);
  console.log(`  Nueve de cada diez, con ${nueveDeCada} o menos.`);
  if (total < MINIMO_PARA_CONCLUIR) {
    console.log(`  ⚠ Solo ${total} citas observadas: sirve para orientarse, no para decidir.`);
  } else {
    console.log(`  → Anunciar más allá de ${nueveDeCada} días vista apenas capta demanda.`);
  }
}

function sumaHasta(cuenta, claves, limite) {
  return claves.filter(d => d <= limite).reduce((s, d) => s + cuenta[d], 0);
}

/** Qué días de la semana cuesta más llenar: ahí es donde la publicidad rinde. */
function porDiaDeSemana(muestras) {
  const ultima = muestras.at(-1);
  const porDia = {};
  for (const [f, libres] of Object.entries(ultima.porDia)) {
    const d = new Date(f + 'T12:00:00').getDay();
    porDia[d] = porDia[d] ?? { libres: 0, dias: 0 };
    porDia[d].libres += libres;
    porDia[d].dias++;
  }
  titulo('HUECOS LIBRES POR DÍA DE LA SEMANA');
  const medias = Object.entries(porDia)
    .map(([d, v]) => ({ dia: DIAS[d], media: v.libres / v.dias }))
    .sort((a, b) => b.media - a.media);
  const max = Math.max(...medias.map(m => m.media));
  for (const m of medias) {
    console.log(`  ${m.dia.padEnd(11)} ${barra(m.media, max).padEnd(35)} ${m.media.toFixed(1)} libres de media`);
  }
  if (medias.length) {
    console.log(`\n  El día con más hueco por llenar es el ${medias[0].dia}.`);
  }
}

/** A qué horas queda sitio: sirve para decidir cuándo pujar más. */
function porFranja(muestras) {
  const conFranjas = muestras.filter(m => m.porFranja);
  titulo('HUECOS LIBRES POR FRANJA HORARIA');
  if (!conFranjas.length) {
    return console.log('  (aún no se captura este dato; se empezó a guardar el 2 ago 2026)');
  }
  const ultima = conFranjas.at(-1);
  const suma = { manana: 0, mediodia: 0, tarde: 0 };
  for (const v of Object.values(ultima.porFranja)) {
    suma.manana += v.manana; suma.mediodia += v.mediodia; suma.tarde += v.tarde;
  }
  const nombres = { manana: 'Mañana 11-14', mediodia: 'Mediodía 14-17', tarde: 'Tarde 17-20' };
  const max = Math.max(...Object.values(suma));
  for (const k of ['manana', 'mediodia', 'tarde']) {
    console.log(`  ${nombres[k].padEnd(16)} ${barra(suma[k], max).padEnd(35)} ${suma[k]}`);
  }
  const menor = Object.entries(suma).sort((a, b) => a[1] - b[1])[0];
  console.log(`\n  La franja que antes se llena es ${nombres[menor[0]].toLowerCase()}.`);
}

/**
 * La pregunta del millón: si el ritmo natural cubre los huecos que quedan, la
 * publicidad no añade citas — como mucho las adelanta.
 */
function seLlenaSola(muestras, horas) {
  const ultima = muestras.at(-1);
  const libres = ultima.total;
  const hoy = new Date(ultima.momento).toISOString().slice(0, 10);
  const diasQueQuedan = Object.keys(ultima.porDia).filter(f => f >= hoy).length;

  let reservadas = 0;
  for (const [a, b] of pares(muestras)) {
    for (const dia of diasDe(a, b)) {
      const delta = (a.porDia[dia] ?? 0) - (b.porDia[dia] ?? 0);
      if (delta > 0) reservadas += delta;
    }
  }
  const ritmo = reservadas / horas * 24;

  titulo('¿SE LLENA SOLA?');
  console.log(`  Huecos libres ahora        ${libres}`);
  console.log(`  Días abiertos por delante  ${diasQueQuedan}`);
  console.log(`  Hacen falta                ${(libres / (diasQueQuedan || 1)).toFixed(1)} citas/día para llenarlo todo`);
  console.log(`  Ritmo natural observado    ${ritmo.toFixed(1)} citas/día`);

  const necesario = libres / (diasQueQuedan || 1);
  console.log();
  if (ritmo >= necesario * 1.15) {
    console.log('  \x1b[33mSE LLENA SOLA.\x1b[0m La publicidad no añade citas: como mucho las adelanta.');
    console.log('  Solo se justifica el gasto si trae un cliente distinto —de fuera, de más');
    console.log('  valor— y eso hay que medirlo aparte, con el clic de reserva.');
  } else if (ritmo >= necesario * 0.85) {
    console.log('  \x1b[36mJUSTO.\x1b[0m El ritmo natural cubre casi lo justo. La publicidad ayuda en');
    console.log('  los días flojos, pero no hace falta encenderla todos los días.');
  } else {
    console.log('  \x1b[32mNO SE LLENA SOLA.\x1b[0m Falta demanda: aquí la publicidad sí aporta citas');
    console.log('  que de otro modo no se harían.');
  }
  if (horas < 48) {
    console.log(`\n  ⚠ Solo ${horas.toFixed(0)} h observadas. Con menos de dos días el ritmo baila mucho.`);
  }
}

const pares = a => a.slice(0, -1).map((x, i) => [x, a[i + 1]]);
const diasDe = (a, b) => new Set([...Object.keys(a.porDia), ...Object.keys(b.porDia)]);

main();
