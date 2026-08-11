/**
 * Disparado por el cron de Vercel (vercel.json) cada hora. Corre en el
 * servidor de Vercel, no en el Mac de Alex — sigue funcionando aunque el
 * portátil esté dormido o apagado (causa raíz del 12 ago 2026: el cron
 * local en `crontab -l` se salta el run entero si la máquina no está
 * despierta en el minuto exacto, sin aviso ni reintento).
 *
 * Guarda un snapshot en Vercel Blob para las estadísticas de tendencia
 * (ritmo natural de reserva, reservas de hoy) que usa el panel. El control
 * pausa/activa en sí NO depende de esto — /api/circuit-control se calcula
 * en vivo en cada petición, así que aunque este cron fallara un día la
 * campaña se seguiría pausando/activando bien; solo se perdería tendencia.
 */
import { put, head } from '@vercel/blob';
import { consultar, resumir, VENTANA } from './_lib/circuit.mjs';

const HISTORICO_PATHNAME = 'circuit-2026/agenda-historico.jsonl';

async function leerHistorico() {
  try {
    const meta = await head(HISTORICO_PATHNAME);
    const resp = await fetch(meta.url, { cache: 'no-store' });
    if (!resp.ok) return '';
    return await resp.text();
  } catch {
    return ''; // todavía no existe el blob: primer run
  }
}

export default async function handler(req, res) {
  const secreto = req.headers['authorization'];
  if (secreto !== `Bearer ${process.env.CRON_SECRET}`) {
    res.status(401).json({ error: 'no autorizado' });
    return;
  }

  try {
    const { porDia, total } = resumir(await consultar(VENTANA.inicio, VENTANA.fin));
    const linea = JSON.stringify({
      momento: new Date().toISOString(),
      ventana: `${VENTANA.inicio}/${VENTANA.fin}`,
      total,
      porDia
    });

    const previo = await leerHistorico();
    const nuevo = previo + linea + '\n';

    await put(HISTORICO_PATHNAME, nuevo, {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/x-ndjson'
    });

    res.status(200).json({ ok: true, total, lineas: nuevo.trim().split('\n').length });
  } catch (err) {
    res.status(500).json({ error: String(err?.message ?? err) });
  }
}
