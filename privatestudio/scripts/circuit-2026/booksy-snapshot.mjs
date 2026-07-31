#!/usr/bin/env node
/**
 * SNAPSHOT DE AGENDA — Private Studio (Booksy 90283)
 *
 * Consulta los huecos libres del 1 al 9 de agosto y añade una línea al histórico.
 * Comparando snapshots consecutivos se obtiene la VELOCIDAD NATURAL DE RESERVA:
 * cuántas citas se llenan solas, sin publicidad. Ese es el dato que separa lo que
 * aporta la campaña de lo que iba a ocurrir igualmente.
 *
 * Uso:  node booksy-snapshot.mjs            → guarda snapshot y muestra el delta
 *       node booksy-snapshot.mjs --resumen  → solo muestra el histórico
 *
 * Sin dependencias. Node 18+.
 */

import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const HISTORICO = join(AQUI, 'agenda-historico.jsonl');

const NEGOCIO = 90283;
// CORTE DE CABELLO / MENS HAIR CUT — 20,00 € · 35 min. Servicio de referencia:
// es el más representativo y su duración define la rejilla de huecos.
const VARIANTE = 2430520;
const DURACION_MIN = 35;

const VENTANA = { inicio: '2026-08-01', fin: '2026-08-09' };

const API = `https://es.booksy.com/core/v2/customer_api/me/businesses/${NEGOCIO}/appointments/time_slots`;
const CABECERAS = {
  'x-api-key': 'web-e3d812bf-d7a2-445d-ab38-55589ae6a121',
  'x-app-version': '3.0',
  'content-type': 'application/json',
  'accept': 'application/json',
  'accept-language': 'es',
  'referer': 'https://booksy.com/',
  'user-agent': 'Mozilla/5.0'
};

/** Empaqueta las horas de inicio disponibles en citas reales sin solapes. */
function citasReales(horas) {
  const minutos = horas
    .map(t => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)))
    .sort((a, b) => a - b);
  let total = 0, libreDesde = -1;
  for (const m of minutos) {
    if (m >= libreDesde) { total++; libreDesde = m + DURACION_MIN; }
  }
  return total;
}

async function consultar() {
  const resp = await fetch(API, {
    method: 'POST',
    headers: CABECERAS,
    body: JSON.stringify({
      subbookings: [{ service_variant_id: VARIANTE, staffer_id: -1 }],
      start_date: VENTANA.inicio,
      end_date: VENTANA.fin
    })
  });
  if (!resp.ok) throw new Error(`Booksy respondió ${resp.status}`);
  return resp.json();
}

function resumir(datos) {
  const porDia = {};
  // staff_time_slots da los huecos por barbero; sumarlos evita infravalorar
  // la capacidad cuando trabajan varios a la vez.
  for (const barbero of datos.staff_time_slots ?? []) {
    for (const dia of barbero.time_slots ?? []) {
      const horas = (dia.slots ?? []).map(s => s.t);
      if (!horas.length) continue;
      porDia[dia.date] = (porDia[dia.date] ?? 0) + citasReales(horas);
    }
  }
  const total = Object.values(porDia).reduce((a, b) => a + b, 0);
  return { porDia, total };
}

async function historico() {
  try {
    const txt = await readFile(HISTORICO, 'utf8');
    return txt.trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
  } catch { return []; }
}

async function main() {
  const previos = await historico();

  if (process.argv.includes('--resumen')) {
    if (!previos.length) return console.log('Sin snapshots todavía.');
    console.log('momento               huecos   variación');
    let anterior = null;
    for (const s of previos) {
      const delta = anterior === null ? '' :
        (s.total - anterior > 0 ? `+${s.total - anterior} liberados` : `${anterior - s.total} reservados`);
      console.log(`${s.momento.slice(0, 16).replace('T', ' ')}   ${String(s.total).padStart(4)}   ${delta}`);
      anterior = s.total;
    }
    return;
  }

  const datos = await consultar();
  const { porDia, total } = resumir(datos);
  const momento = new Date().toISOString();

  await mkdir(dirname(HISTORICO), { recursive: true });
  await writeFile(HISTORICO, JSON.stringify({ momento, total, porDia }) + '\n', { flag: 'a' });

  const ultimo = previos.at(-1);
  console.log(`[${momento.slice(0, 16).replace('T', ' ')}] huecos libres 1–9 ago: ${total}`);
  for (const [fecha, n] of Object.entries(porDia)) console.log(`   ${fecha}  ${n}`);

  if (ultimo) {
    const dif = ultimo.total - total;
    const horas = (Date.parse(momento) - Date.parse(ultimo.momento)) / 3600000;
    if (dif > 0) {
      console.log(`\n→ ${dif} citas reservadas en las últimas ${horas.toFixed(1)} h ` +
                  `(${(dif / horas * 24).toFixed(1)}/día sin publicidad)`);
    } else if (dif < 0) {
      console.log(`\n→ ${-dif} huecos liberados (cancelaciones o cambio de agenda)`);
    } else {
      console.log(`\n→ sin cambios en ${horas.toFixed(1)} h`);
    }
  } else {
    console.log('\n→ primer snapshot: la línea base empieza a contar desde aquí.');
  }
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
