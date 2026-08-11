/**
 * Datos en vivo para el panel público (panel-76380b752010.html). El panel ya
 * leía el gasto real vía fetch a un CSV publicado por el guardián de Ads;
 * esto extiende el mismo patrón al resto de números (huecos, calendario,
 * reservas de hoy, ritmo) para que el panel esté siempre al día en cuanto
 * se abre, sin depender de que el cron local del Mac haya publicado nada.
 */
import { head } from '@vercel/blob';
import { consultar, resumir, estaCerrado, VENTANA, calcularControl } from './_lib/circuit.mjs';

const HISTORICO_PATHNAME = 'circuit-2026/agenda-historico.jsonl';

async function leerHistorico() {
  try {
    const meta = await head(HISTORICO_PATHNAME);
    const resp = await fetch(meta.url, { cache: 'no-store' });
    if (!resp.ok) return [];
    const texto = await resp.text();
    return texto.trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
  } catch {
    return [];
  }
}

const iso = d => d.toISOString().slice(0, 10);

export default async function handler(_req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const [{ porDia, total }, control, historial] = await Promise.all([
      resumir(await consultar(VENTANA.inicio, VENTANA.fin)),
      calcularControl(),
      leerHistorico()
    ]);

    // Calendario completo: todos los días de la ventana, incluidos los
    // vacíos, para que el panel distinga «sin huecos» de «no consultado».
    const diasVentana = [];
    for (let d = new Date(VENTANA.inicio + 'T12:00:00'); iso(d) <= VENTANA.fin; d = new Date(d.getTime() + 86400000)) {
      const fecha = iso(d);
      diasVentana.push({ fecha, citas: porDia[fecha] ?? 0, cerrado: estaCerrado(fecha) });
    }

    // Reservas de hoy: huecos consumidos SOLO hoy entre el primer y el
    // último snapshot de hoy guardados en Blob por /api/circuit-refresh.
    const hoyISO = iso(new Date());
    const deHoy = historial.filter(s => s.momento.slice(0, 10) === hoyISO);
    const reservadasHoy = deHoy.length > 1
      ? Math.max(0, (deHoy[0].porDia?.[hoyISO] ?? 0) - (deHoy.at(-1).porDia?.[hoyISO] ?? 0))
      : 0;

    // Ritmo natural: huecos que se llenan solos por día, sobre toda la serie.
    let ritmo = null;
    if (historial.length > 1) {
      const h = (Date.parse(historial.at(-1).momento) - Date.parse(historial[0].momento)) / 3600000;
      if (h > 0.5) ritmo = Math.round((historial[0].total - historial.at(-1).total) / h * 24);
    }

    res.status(200).json({
      control,
      dias_ventana: diasVentana,
      citas_ventana: total,
      reservadas_hoy: reservadasHoy,
      ritmo,
      actualizado: new Date().toISOString()
    });
  } catch (err) {
    res.status(502).json({ error: String(err?.message ?? err) });
  }
}
