/**
 * Lógica compartida del control de campaña Circuit 2026 — Private Studio.
 *
 * Puerto de scripts/circuit-2026/booksy-snapshot.mjs a función serverless de
 * Vercel. Mismo negocio, misma variante, mismo criterio de pausa/activa;
 * la diferencia es que esto corre en el cron de Vercel (siempre despierto)
 * en vez de en el cron local del Mac de Alex (se salta el run si el
 * portátil está dormido — causa raíz documentada el 12 ago 2026).
 */

const NEGOCIO = 90283;
// CORTE DE CABELLO / MENS HAIR CUT — 20,00 € · 35 min. Servicio de referencia:
// es el más representativo y su duración define la rejilla de huecos.
const VARIANTE = 2430520;
const DURACION_MIN = 35;

export const VENTANA = { inicio: '2026-08-01', fin: '2026-08-15' };

/**
 * Días que la barbería tiene cerrados aunque no sean domingo. Hay que
 * declararlos a mano: Booksy devuelve lo mismo (nada) para un día lleno,
 * uno cerrado y un festivo — no hay forma de distinguirlos por la API.
 */
const FESTIVOS = ['2026-08-15']; // Asunción — festivo nacional

const ANUNCIAR_CON_TIENDA_CERRADA = false;

export const estaCerrado = fechaIso =>
  new Date(fechaIso + 'T12:00:00').getDay() === 0 || FESTIVOS.indexOf(fechaIso) !== -1;

// Si en los próximos dos días ABIERTOS quedan menos citas que esto, se pausa.
export const MINIMO_PARA_SEGUIR = 1;

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

export async function consultar(desde, hasta) {
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
export function resumir(datos) {
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

/**
 * Calcula el control dinámico ahora mismo, en vivo, sin depender de ningún
 * dato guardado. Es la pieza que protege el gasto: si algo falla leyendo
 * esto, mejor que falle claro (el guardián de Ads ya sabe pausar solo ante
 * una respuesta ilegible) a que arrastre un dato guardado obsoleto.
 */
export async function calcularControl() {
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

  const cuando = diasAbiertos
    .map(f => (f === iso(hoy) ? 'hoy' : ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'][new Date(f + 'T12:00:00').getDay()]))
    .join(' y ');

  return {
    estado,
    citas_48h: citasDisponibles,
    proximos_abiertos: abiertos,
    detalle_48h: Object.fromEntries(abiertos.map(d => [d.fecha, d.citas])),
    actualizado: new Date().toISOString(),
    hoy_cerrado: hoyCerrado,
    motivo: hoyCerrado && !ANUNCIAR_CON_TIENDA_CERRADA
      ? 'tienda cerrada hoy'
      : estado === 'activa'
        ? `${citasDisponibles} citas libres ${cuando}`
        : `sin huecos ${cuando}: no se paga por clics que no pueden reservar`
  };
}
