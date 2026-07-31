#!/usr/bin/env node
/**
 * SNAPSHOT DE AGENDA + CONTROL DE CAMPAÑA — Private Studio (Booksy 90283)
 *
 * Hace dos cosas en cada ejecución:
 *
 *  1. LÍNEA BASE — guarda cuántos huecos quedan en la ventana del festival.
 *     Comparando snapshots se obtiene la velocidad natural de reserva: cuántas
 *     citas se llenan solas. Es el dato que separa lo que aporta la campaña de
 *     lo que iba a ocurrir igualmente.
 *
 *  2. CONTROL DINÁMICO — mira la disponibilidad de HOY y MAÑANA y escribe
 *     `public/ads-control.json`, que el guardián de Google Ads lee cada hora.
 *     Si no hay dónde meter a nadie en las próximas 48 h, la campaña se pausa
 *     sola. Cuando se libera un hueco, vuelve.
 *
 * El fichero se publica en la web (deploy automático) porque es la única
 * superficie que un Google Ads Script puede leer sin credenciales.
 *
 * Uso:  node booksy-snapshot.mjs             → snapshot + control + push si cambia
 *       node booksy-snapshot.mjs --resumen   → histórico, sin tocar nada
 *       node booksy-snapshot.mjs --sin-push  → calcula y escribe, pero no publica
 *
 * Sin dependencias. Node 18+.
 */

import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const ejecutar = promisify(execFile);

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '..', '..');
const HISTORICO = join(AQUI, 'agenda-historico.jsonl');
const CONTROL = join(RAIZ, 'public', 'ads-control.json');

const NEGOCIO = 90283;
// CORTE DE CABELLO / MENS HAIR CUT — 20,00 € · 35 min. Servicio de referencia:
// es el más representativo y su duración define la rejilla de huecos.
const VARIANTE = 2430520;
const DURACION_MIN = 35;

const VENTANA = { inicio: '2026-08-01', fin: '2026-08-15' };

// Si en HOY + MAÑANA quedan menos citas que esto, se pausa la campaña: no tiene
// sentido pagar por clics de gente que no puede reservar en las próximas 48 h.
const MINIMO_PARA_SEGUIR = 1;

// Presupuesto diario según huecos libres en los próximos 3 días. Un día lleno con
// los siguientes vacíos baja el gasto de hoy y lo deja disponible para mañana;
// varios días vacíos por delante lo suben. El tope total de 200 € lo sigue
// vigilando el guardián, así que esto redistribuye, no añade gasto.
const TRAMOS_PRESUPUESTO = [
  { hastaCitas: 5,        euros: 10 },
  { hastaCitas: 15,       euros: 20 },
  { hastaCitas: Infinity, euros: 30 }
];
const DIAS_HORIZONTE = 3;

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

async function consultar(desde, hasta) {
  const resp = await fetch(API, {
    method: 'POST',
    headers: CABECERAS,
    body: JSON.stringify({
      subbookings: [{ service_variant_id: VARIANTE, staffer_id: -1 }],
      start_date: desde,
      end_date: hasta
    })
  });
  if (!resp.ok) throw new Error(`Booksy respondió ${resp.status}`);
  return resp.json();
}

/** Suma por barbero: dos barberos a la misma hora son dos citas, no una. */
function resumir(datos) {
  const porDia = {};
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

const iso = d => d.toISOString().slice(0, 10);

async function historico() {
  try {
    const txt = await readFile(HISTORICO, 'utf8');
    return txt.trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
  } catch { return []; }
}

const git = (...args) => ejecutar('git', args, { cwd: RAIZ });

/** El estado que hay realmente publicado = el último commiteado, no el fichero local. */
async function estadoPublicado() {
  try {
    const { stdout } = await git('show', 'HEAD:public/ads-control.json');
    return JSON.parse(stdout).estado;
  } catch { return null; }   // aún no existe en el repo
}

/**
 * Publica si el fichero difiere de lo commiteado. Se apoya en git en vez de en
 * el estado en memoria: así una publicación fallida se reintenta sola en la
 * siguiente ejecución, en vez de quedarse escrita solo en local para siempre.
 */
async function publicar(control, anterior) {
  await mkdir(dirname(CONTROL), { recursive: true });
  await writeFile(CONTROL, JSON.stringify(control, null, 2) + '\n');

  if (process.argv.includes('--sin-push')) return 'escrito en local (--sin-push)';

  const { stdout } = await git('status', '--porcelain', 'public/ads-control.json');
  if (!stdout.trim()) return 'idéntico a lo publicado, nada que hacer';

  await git('add', 'public/ads-control.json');
  await git('commit', '-m',
    `control: campana ${control.estado} (${control.citas_48h} citas libres en 48h)`);
  await git('push', 'origin', 'main');
  return `publicado: ${anterior ?? '(nuevo)'} → ${control.estado}`;
}

async function main() {
  const previos = await historico();

  if (process.argv.includes('--resumen')) {
    if (!previos.length) return console.log('Sin snapshots todavía.');
    // Agrupado por ventana: comparar totales de rangos distintos no significa nada.
    const ventanas = [...new Set(previos.map(s => s.ventana ?? '(sin ventana)'))];
    for (const v of ventanas) {
      const serie = previos.filter(s => (s.ventana ?? '(sin ventana)') === v);
      console.log(`\nVentana ${v}`);
      console.log('  momento             huecos   variación');
      let anterior = null;
      for (const s of serie) {
        const d = anterior === null ? '—' :
          s.total < anterior ? `${anterior - s.total} reservadas`
          : s.total > anterior ? `+${s.total - anterior} liberadas`
          : 'sin cambios';
        console.log(`  ${s.momento.slice(0, 16).replace('T', ' ')}   ${String(s.total).padStart(4)}   ${d}`);
        anterior = s.total;
      }
      if (serie.length > 1) {
        const h = (Date.parse(serie.at(-1).momento) - Date.parse(serie[0].momento)) / 3600000;
        const netas = serie[0].total - serie.at(-1).total;
        if (h > 0) console.log(`  → ritmo natural: ${(netas / h * 24).toFixed(1)} citas/día sin publicidad`);
      }
    }
    return;
  }

  // ── 1 · Línea base de la ventana completa
  const { porDia, total } = resumir(await consultar(VENTANA.inicio, VENTANA.fin));
  const momento = new Date().toISOString();

  const ventana = `${VENTANA.inicio}/${VENTANA.fin}`;
  await mkdir(dirname(HISTORICO), { recursive: true });
  await writeFile(HISTORICO, JSON.stringify({ momento, ventana, total, porDia }) + '\n', { flag: 'a' });

  console.log(`[${momento.slice(0, 16).replace('T', ' ')}] huecos en la ventana: ${total}`);

  // Solo se compara contra snapshots de la MISMA ventana: si cambia el rango de
  // fechas, el delta no significa nada (más días = más huecos, no menos reservas).
  const ultimo = [...previos].reverse().find(s => s.ventana === ventana);
  if (ultimo) {
    const dif = ultimo.total - total;
    const horas = (Date.parse(momento) - Date.parse(ultimo.momento)) / 3600000;
    if (dif > 0) console.log(`   ${dif} citas reservadas en ${horas.toFixed(1)} h (${(dif / horas * 24).toFixed(1)}/día sin publicidad)`);
    else if (dif < 0) console.log(`   ${-dif} huecos liberados (cancelaciones)`);
    else console.log(`   sin cambios en ${horas.toFixed(1)} h`);
  } else {
    console.log(`   primer snapshot de la ventana ${ventana}: la línea base empieza aquí.`);
  }

  // ── 2 · Control dinámico según disponibilidad de hoy y mañana
  const hoy = new Date();
  const manana = new Date(hoy.getTime() + 86400000);
  const horizonte = new Date(hoy.getTime() + (DIAS_HORIZONTE - 1) * 86400000);

  const corto = resumir(await consultar(iso(hoy), iso(manana)));
  const citas48h = corto.total;

  // El presupuesto mira 3 días, no 2: si hoy está lleno pero pasado mañana está
  // vacío, sigue mereciendo la pena gastar en captar para esos días.
  const medio = resumir(await consultar(iso(hoy), iso(horizonte)));
  const presupuesto = TRAMOS_PRESUPUESTO.find(t => medio.total <= t.hastaCitas).euros;

  const estado = citas48h >= MINIMO_PARA_SEGUIR ? 'activa' : 'pausa';
  const control = {
    estado,
    presupuesto_diario: presupuesto,
    citas_48h: citas48h,
    citas_horizonte: medio.total,
    detalle_48h: corto.porDia,
    citas_ventana: total,
    actualizado: momento,
    motivo: estado === 'activa'
      ? `${citas48h} citas libres entre hoy y mañana · ${medio.total} en ${DIAS_HORIZONTE} días → €${presupuesto}/día`
      : 'agenda llena en las próximas 48 h: no se paga por clics que no pueden reservar'
  };

  const anterior = await estadoPublicado();
  const resultado = await publicar(control, anterior);
  console.log(`\ncontrol: ${estado.toUpperCase()} · €${presupuesto}/día`);
  console.log(`   ${citas48h} citas libres en 48 h · ${medio.total} en ${DIAS_HORIZONTE} días`);
  console.log(`   ${resultado}`);
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
