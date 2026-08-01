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
// Nombre no adivinable: el panel muestra datos de negocio del cliente.
const PANEL_NOMBRE = 'panel-76380b752010.html';
const PANEL = join(RAIZ, 'public', PANEL_NOMBRE);
const PLANTILLA = join(AQUI, 'panel-plantilla.html');

const NEGOCIO = 90283;
// CORTE DE CABELLO / MENS HAIR CUT — 20,00 € · 35 min. Servicio de referencia:
// es el más representativo y su duración define la rejilla de huecos.
const VARIANTE = 2430520;
const DURACION_MIN = 35;

const VENTANA = { inicio: '2026-08-01', fin: '2026-08-15' };

// Si en HOY + MAÑANA quedan menos citas que esto, se pausa la campaña: no tiene
// sentido pagar por clics de gente que no puede reservar en las próximas 48 h.
const MINIMO_PARA_SEGUIR = 1;

// Presupuesto diario fijo. Se probó a variarlo según huecos y se descartó: Google
// reparte el gasto a lo largo del día y cambiarlo varias veces lo desestabiliza,
// para un ahorro de pocos euros sobre un techo de 200 €. Lo que sí se automatiza
// es la pausa cuando no hay dónde meter a nadie.
const PRESUPUESTO_DIARIO = 20;

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

/**
 * Los instantes se guardan en ISO (UTC) porque es lo correcto para comparar,
 * pero los mensajes se leen a mano: ahí va la hora del reloj de la barbería.
 * Sin esto el log parece ir dos horas atrasado y no hay forma de saber si el
 * cron se ha disparado.
 */
const horaLocal = iso => new Date(iso).toLocaleString('sv-SE', { timeZone: 'Europe/Madrid' }).slice(0, 16);

/**
 * El estado que hay realmente publicado = el último commiteado, no el fichero
 * local. El `./` es obligatorio: la raíz del repositorio está un nivel por
 * encima de este proyecto, así que sin él git busca `public/` en la raíz del
 * repo, no encuentra nada y todo cambio parece nuevo.
 */
async function estadoPublicado() {
  try {
    const { stdout } = await git('show', 'HEAD:./public/ads-control.json');
    return JSON.parse(stdout).estado;
  } catch { return null; }   // aún no existe en el repo
}

/**
 * Publica si el fichero difiere de lo commiteado. Se apoya en git en vez de en
 * el estado en memoria: así una publicación fallida se reintenta sola en la
 * siguiente ejecución, en vez de quedarse escrita solo en local para siempre.
 */
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Rellena la plantilla del panel con los datos de este snapshot. */
async function generarPanel(control, historial) {
  let html;
  try { html = await readFile(PLANTILLA, 'utf8'); } catch { return null; }

  const tarjetas = control.proximos_abiertos.map((d, i) => {
    const f = new Date(d.fecha + 'T12:00:00');
    const etiqueta = i === 0 ? 'Hoy' : DIAS[f.getDay()][0].toUpperCase() + DIAS[f.getDay()].slice(1);
    const lleno = d.citas === 0;
    return `<div class="dia${lleno ? ' lleno' : ''}">
        <div class="k">${etiqueta} ${f.getDate()} ${MESES[f.getMonth()]}</div>
        <div class="v">${d.citas}</div>
        <div class="n">${lleno ? 'sin huecos' : d.citas === 1 ? 'hueco libre' : 'huecos libres'}</div>
      </div>`;
  }).join('\n      ');

  // Reservas del día: comparación con el primer snapshot de hoy, misma ventana.
  const hoyISO = control.actualizado.slice(0, 10);
  const deHoy = historial.filter(s => s.momento.slice(0, 10) === hoyISO && s.ventana);
  const reservadasHoy = deHoy.length > 1 ? Math.max(0, deHoy[0].total - deHoy.at(-1).total) : 0;

  // Ritmo natural de reserva: citas que se llenan solas por día, calculado sobre
  // toda la serie de la misma ventana. Es el dato que dice si la campaña aporta algo.
  const serie = historial.filter(s => s.ventana === historial.at(-1)?.ventana);
  let ritmo = '—';
  if (serie.length > 1) {
    const h = (Date.parse(serie.at(-1).momento) - Date.parse(serie[0].momento)) / 3600000;
    if (h > 0.5) ritmo = Math.round((serie[0].total - serie.at(-1).total) / h * 24);
  }

  const sello = new Date(control.actualizado);
  const hora = String(sello.getHours()).padStart(2, '0') + ':' + String(sello.getMinutes()).padStart(2, '0');

  return html
    .replace('{{DIAS}}', tarjetas)
    .replace('{{ESTADO}}', control.estado === 'activa' ? '● En marcha' : '● Pausada: agenda llena')
    .replace('{{CLASE_ESTADO}}', control.estado === 'activa' ? 'ok' : 'warn')
    .replace('{{VENTANA}}', control.citas_ventana)
    .replace('{{RITMO}}', ritmo)
    .replace('{{RESERVADAS}}', reservadasHoy)
    .replace('{{ACTUALIZADO}}', `${sello.getDate()} ${MESES[sello.getMonth()]} · ${hora}`);
}

async function publicar(control, anterior, historial) {
  await mkdir(dirname(CONTROL), { recursive: true });
  await writeFile(CONTROL, JSON.stringify(control, null, 2) + '\n');

  const panel = await generarPanel(control, historial);
  if (panel) await writeFile(PANEL, panel);

  if (process.argv.includes('--sin-push')) return 'escrito en local (--sin-push)';

  const ficheros = ['public/ads-control.json'];
  if (panel) ficheros.push('public/' + PANEL_NOMBRE);

  const { stdout } = await git('status', '--porcelain', ...ficheros);
  if (!stdout.trim()) return 'idéntico a lo publicado, nada que hacer';

  await git('add', ...ficheros);
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
        console.log(`  ${horaLocal(s.momento)}   ${String(s.total).padStart(4)}   ${d}`);
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

  console.log(`[${horaLocal(momento)}] huecos en la ventana: ${total}`);

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
  const corto = resumir(await consultar(iso(hoy), iso(manana)));
  const citas48h = corto.total;

  // Próximos 2 días ABIERTOS: el domingo no cuenta, así que si mañana es domingo
  // se mira el lunes. Es lo que de verdad importa para decidir si seguir gastando.
  const diasAbiertos = [];
  for (let i = 0; diasAbiertos.length < 2 && i < 5; i++) {
    const d = new Date(hoy.getTime() + i * 86400000);
    if (d.getDay() !== 0) diasAbiertos.push(iso(d));
  }
  const proximos = resumir(await consultar(diasAbiertos[0], diasAbiertos.at(-1)));
  const abiertos = diasAbiertos.map(f => ({ fecha: f, citas: proximos.porDia[f] ?? 0 }));

  const estado = citas48h >= MINIMO_PARA_SEGUIR ? 'activa' : 'pausa';
  const control = {
    estado,
    presupuesto_diario: PRESUPUESTO_DIARIO,
    citas_48h: citas48h,
    proximos_abiertos: abiertos,
    detalle_48h: corto.porDia,
    citas_ventana: total,
    actualizado: momento,
    motivo: estado === 'activa'
      ? `${citas48h} citas libres entre hoy y mañana`
      : 'agenda llena en las próximas 48 h: no se paga por clics que no pueden reservar'
  };

  const anterior = await estadoPublicado();
  const resultado = await publicar(control, anterior, [...previos, { momento, ventana, total }]);
  console.log(`\ncontrol: ${estado.toUpperCase()} — ${citas48h} citas libres en 48 h`);
  console.log(`   ${resultado}`);
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
