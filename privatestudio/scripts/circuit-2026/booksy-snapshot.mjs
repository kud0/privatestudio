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
// Copia de trabajo aparte, fuera del proyecto, para publicar en producción sin
// interferir con la rama en la que se esté trabajando.
const APARTADO = join(RAIZ, '..', '.publicacion-privatestudio');

const NEGOCIO = 90283;
// CORTE DE CABELLO / MENS HAIR CUT — 20,00 € · 35 min. Servicio de referencia:
// es el más representativo y su duración define la rejilla de huecos.
const VARIANTE = 2430520;
const DURACION_MIN = 35;

const VENTANA = { inicio: '2026-08-01', fin: '2026-08-15' };

/**
 * Días que la barbería tiene cerrados aunque no sean domingo.
 *
 * Hay que declararlos a mano porque Booksy devuelve exactamente lo mismo —nada—
 * para un día lleno, uno cerrado y un festivo. Comprobado consultando el 1 de
 * agosto (abierto y lleno), el 2 (domingo) y el 15 (festivo): los tres dan cero
 * barberos y cero fechas. No hay forma de distinguirlos por la API.
 *
 * Sin esta lista, el 15 de agosto se leería como «lleno» y la campaña seguiría
 * anunciándose un sábado con la persiana bajada.
 */
const FESTIVOS = [
  '2026-08-15'   // Asunción — festivo nacional
];

/**
 * Anunciarse los días que la tienda está cerrada. En falso por coherencia con
 * la decisión ya tomada de no anunciar los domingos: si no se atiende, no se
 * paga por aparecer. Ponerlo en cierto haría falta también quitar la exclusión
 * del domingo en el horario de la campaña de Google Ads.
 */
const ANUNCIAR_CON_TIENDA_CERRADA = false;

/** Verdadero si ese día la barbería no abre: domingo o festivo declarado. */
const estaCerrado = fechaIso =>
  new Date(fechaIso + 'T12:00:00').getDay() === 0 || FESTIVOS.indexOf(fechaIso) !== -1;

// Si en los próximos dos días ABIERTOS quedan menos citas que esto, se pausa la
// campaña: no tiene sentido pagar por clics de gente que no puede reservar.
//
// Dos días abiertos, no dos días naturales. La primera versión miraba hoy y
// mañana sin más, y el domingo (cerrado, cero huecos) se comía medio criterio:
// un sábado por la tarde con la agenda llena y el lunes con nueve huecos libres
// daba «0 citas en 48 h» y apagaba la campaña justo cuando había sitio que
// vender. Pasó de verdad el 1 de agosto de 2026.
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

/** A qué franja pertenece una hora de inicio "HH:MM". */
function franjaDe(h) {
  const hora = Number(h.slice(0, 2));
  return hora < 14 ? 'manana' : hora < 17 ? 'mediodia' : 'tarde';
}

/**
 * Suma por barbero: dos barberos a la misma hora son dos citas, no una.
 *
 * Devuelve también el reparto por franja horaria. Ese dato no lo usa el control
 * de la campaña, pero es el único momento en que existe: Booksy solo dice qué
 * hay libre AHORA, no guarda historia. Lo que no se anote aquí se pierde para
 * siempre, y saber a qué horas se llena antes una barbería es justo lo que hace
 * falta para llevar la siguiente.
 *
 * `porFranja` cuenta citas reales por franja (mismo empaquetado sin solapes que
 * `porDia`, aplicado por separado a cada franja), no marcas de horario en bruto:
 * Booksy devuelve una marca cada pocos minutos, así que sumarlas directamente
 * multiplicaba por varias veces el número real de huecos reservables.
 */
function resumir(datos) {
  const porDia = {};
  const porFranja = {};
  for (const barbero of datos.staff_time_slots ?? []) {
    for (const dia of barbero.time_slots ?? []) {
      const horas = (dia.slots ?? []).map(s => s.t);
      if (!horas.length) continue;
      porDia[dia.date] = (porDia[dia.date] ?? 0) + citasReales(horas);

      const porFranjaDelDia = porFranja[dia.date] ?? { manana: 0, mediodia: 0, tarde: 0 };
      for (const franja of ['manana', 'mediodia', 'tarde']) {
        const horasDeLaFranja = horas.filter(h => franjaDe(h) === franja);
        porFranjaDelDia[franja] += citasReales(horasDeLaFranja);
      }
      porFranja[dia.date] = porFranjaDelDia;
    }
  }
  const total = Object.values(porDia).reduce((a, b) => a + b, 0);
  return { porDia, porFranja, total };
}

const iso = d => d.toISOString().slice(0, 10);

async function historico() {
  try {
    const txt = await readFile(HISTORICO, 'utf8');
    return txt.trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
  } catch { return []; }
}

const git = (...args) => ejecutar('git', args, { cwd: RAIZ });

// Rama desde la que publica el hosting. Todo lo que no llegue aquí no existe
// para el guardián de Google Ads.
const RAMA_PRODUCCION = 'main';

/**
 * El repositorio es un sitio de trabajo: alguien puede estar en una rama de
 * desarrollo cuando el cron se dispara. Si eso pasa, los commits del control se
 * quedan en esa rama, el hosting no despliega nada y el guardián sigue leyendo
 * un estado congelado sin que salte ninguna alarma.
 *
 * Ocurrió el 3 de agosto de 2026: el repositorio estaba en `seo/fase-1-criticos`
 * y la campaña estuvo cinco horas decidiendo con la agenda de las nueve de la
 * mañana. Por eso ahora se comprueba antes de publicar, y si no es la rama de
 * producción se dice claramente en vez de fallar en silencio.
 */
async function ramaActual() {
  try {
    const { stdout } = await git('rev-parse', '--abbrev-ref', 'HEAD');
    return stdout.trim();
  } catch { return null; }
}

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

  const hoyFecha = control.actualizado.slice(0, 10);

  // Calendario de toda la ventana, un día por fila. La barra da la proporción de
  // un vistazo: qué días están vacíos y cuáles a rebosar, sin leer los números.
  const maximo = Math.max(1, ...control.dias_ventana.map(d => d.citas));

  const calendario = control.dias_ventana.map(d => {
    const f = new Date(d.fecha + 'T12:00:00');
    const nombre = DIAS[f.getDay()].slice(0, 3);
    const esHoy = d.fecha === hoyFecha;
    const pasado = d.fecha < hoyFecha;

    const clases = ['fila'];
    if (d.cerrado) clases.push('cerrado');
    if (esHoy) clases.push('hoy');
    if (pasado) clases.push('pasado');
    if (d.decide) clases.push('decide');
    if (!d.cerrado && !pasado && d.citas === 0) clases.push('lleno');

    const etiqueta = esHoy ? 'Hoy' : nombre[0].toUpperCase() + nombre.slice(1);
    const ancho = d.cerrado ? 0 : Math.round((d.citas / maximo) * 100);

    const texto = d.cerrado ? 'cerrado'
      : pasado ? '—'
      : d.citas === 0 ? 'lleno'
      : String(d.citas);

    return `<div class="${clases.join(' ')}">
        <div class="f">${etiqueta} ${f.getDate()}</div>
        <div class="b"><i style="width:${ancho}%"></i></div>
        <div class="c">${texto}</div>
      </div>`;
  }).join('\n      ');

  // Las semanas se separan visualmente por el lunes, no por un corte arbitrario.
  const semanas = control.dias_ventana.reduce((n, d) => {
    return n + (new Date(d.fecha + 'T12:00:00').getDay() === 1 ? 1 : 0);
  }, 1);

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

  const decisivos = control.proximos_abiertos
    .map(d => {
      const f = new Date(d.fecha + 'T12:00:00');
      const nombre = d.fecha === hoyFecha ? 'hoy' : DIAS[f.getDay()];
      return `${nombre} ${d.citas}`;
    })
    .join(' · ');

  return html
    .replace('{{CALENDARIO}}', calendario)
    .replace('{{SEMANAS}}', semanas)
    .replace('{{DECISIVOS}}', decisivos)
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

  const mensaje = `control: campana ${control.estado} (${control.citas_48h} citas libres en los proximos 2 dias abiertos)`;
  const rama = await ramaActual();

  if (rama === RAMA_PRODUCCION) {
    await git('add', ...ficheros);
    await git('commit', '-m', mensaje);
    await git('push', 'origin', RAMA_PRODUCCION);
    return `publicado: ${anterior ?? '(nuevo)'} → ${control.estado}`;
  }

  // Estamos en una rama de desarrollo. Se publica igual, por un lado, para que
  // la campaña nunca dependa de en qué esté trabajando alguien.
  await publicarDesdeApartado(ficheros, mensaje);
  return `publicado en ${RAMA_PRODUCCION} desde apartado (el repo está en "${rama}"): ` +
         `${anterior ?? '(nuevo)'} → ${control.estado}`;
}

/**
 * Publica en la rama de producción sin tocar la rama en la que se esté
 * trabajando, usando un worktree aparte. Así el control llega a la web aunque
 * alguien tenga el repositorio en mitad de otra cosa.
 */
async function publicarDesdeApartado(ficheros, mensaje) {
  const { copyFile } = await import('node:fs/promises');

  try { await git('worktree', 'remove', '--force', APARTADO); } catch { /* no existía */ }
  await git('fetch', 'origin', RAMA_PRODUCCION);
  await git('worktree', 'add', '--force', '--detach', APARTADO, `origin/${RAMA_PRODUCCION}`);

  const gitApartado = (...args) => ejecutar('git', args, { cwd: APARTADO });
  try {
    await gitApartado('checkout', '-B', RAMA_PRODUCCION, `origin/${RAMA_PRODUCCION}`);
    for (const f of ficheros) await copyFile(join(RAIZ, f), join(APARTADO, 'privatestudio', f));
    await gitApartado('add', ...ficheros.map(f => join('privatestudio', f)));
    await gitApartado('commit', '-m', mensaje);
    await gitApartado('push', 'origin', RAMA_PRODUCCION);
  } finally {
    try { await git('worktree', 'remove', '--force', APARTADO); } catch { /* da igual */ }
  }
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
  const { porDia, porFranja, total } = resumir(await consultar(VENTANA.inicio, VENTANA.fin));
  const momento = new Date().toISOString();

  const ventana = `${VENTANA.inicio}/${VENTANA.fin}`;
  await mkdir(dirname(HISTORICO), { recursive: true });
  await writeFile(HISTORICO,
    JSON.stringify({ momento, ventana, total, porDia, porFranja }) + '\n', { flag: 'a' });

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

  // ── 2 · Control dinámico según los próximos dos días ABIERTOS
  // El domingo se salta: está cerrado, así que contarlo como día disponible
  // apagaba la campaña los sábados por la tarde aunque el lunes hubiera sitio.
  const hoy = new Date();
  const diasAbiertos = [];
  for (let i = 0; diasAbiertos.length < 2 && i < 10; i++) {
    const f = iso(new Date(hoy.getTime() + i * 86400000));
    if (!estaCerrado(f)) diasAbiertos.push(f);
  }
  const proximos = resumir(await consultar(diasAbiertos[0], diasAbiertos.at(-1)));
  const abiertos = diasAbiertos.map(f => ({ fecha: f, citas: proximos.porDia[f] ?? 0 }));

  const citasDisponibles = abiertos.reduce((suma, d) => suma + d.citas, 0);
  const hoyCerrado = estaCerrado(iso(hoy));

  const estado = (hoyCerrado && !ANUNCIAR_CON_TIENDA_CERRADA) ? 'pausa'
    : citasDisponibles >= MINIMO_PARA_SEGUIR ? 'activa'
    : 'pausa';

  // «hoy» solo si de verdad es hoy: cuando la barbería está cerrada el primer
  // día abierto ya no es el de hoy, y llamarlo así confunde el informe.
  const cuando = diasAbiertos
    .map(f => (f === iso(hoy) ? 'hoy' : DIAS[new Date(f + 'T12:00:00').getDay()]))
    .join(' y ');

  // Todos los días de la ventana, incluidos los que no tienen ni un hueco: sin
  // ellos el panel enseñaría un calendario con agujeros y no se entendería si un
  // día falta porque está lleno o porque no se ha consultado.
  const diasVentana = [];
  for (let d = new Date(VENTANA.inicio + 'T12:00:00');
       iso(d) <= VENTANA.fin;
       d = new Date(d.getTime() + 86400000)) {
    const fecha = iso(d);
    diasVentana.push({
      fecha,
      citas: porDia[fecha] ?? 0,
      cerrado: estaCerrado(fecha),
      decide: diasAbiertos.indexOf(fecha) !== -1
    });
  }

  const control = {
    estado,
    presupuesto_diario: PRESUPUESTO_DIARIO,
    citas_48h: citasDisponibles,
    proximos_abiertos: abiertos,
    detalle_48h: Object.fromEntries(abiertos.map(d => [d.fecha, d.citas])),
    dias_ventana: diasVentana,
    citas_ventana: total,
    actualizado: momento,
    hoy_cerrado: hoyCerrado,
    motivo: hoyCerrado && !ANUNCIAR_CON_TIENDA_CERRADA
      ? 'la barbería no abre hoy: no se paga por anunciarse con la persiana bajada'
      : estado === 'activa'
        ? `${citasDisponibles} citas libres ${cuando}`
        : `sin huecos ${cuando}: no se paga por clics que no pueden reservar`
  };

  const anterior = await estadoPublicado();
  const resultado = await publicar(control, anterior, [...previos, { momento, ventana, total }]);
  console.log(`\ncontrol: ${estado.toUpperCase()} — ${citasDisponibles} citas libres ${cuando}`);
  console.log(`   ${resultado}`);
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
