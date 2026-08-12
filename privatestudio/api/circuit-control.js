/**
 * Endpoint en vivo que el guardián de Google Ads (ads-script-guardia.js) lee
 * cada hora para decidir pausa/activa. Sustituye a public/ads-control.json
 * (publicado por git desde el cron local del Mac) por un cálculo en vivo en
 * cada petición — no depende de que nadie haya publicado nada recientemente.
 *
 * GET público, sin caché: UrlFetchApp de Google Ads Scripts no manda cookies
 * ni cabeceras especiales, así que no hace falta autenticación aquí.
 *
 * También guarda aquí, de paso, el snapshot de tendencia en Vercel Blob (lo
 * que antes hacía /api/circuit-refresh por su cuenta). No porque ese
 * endpoint estuviera mal escrito, sino porque el guardián lo llamaba con un
 * UrlFetchApp adicional cuyo resultado real no se podía verificar — se
 * probó y solo se vieron 2 snapshots en 20 horas de ejecuciones cada hora,
 * en vez de ~20. Este endpoint SÍ está comprobado fiable (es el que
 * mantiene la campaña pausada/activa), así que el guardado de tendencia
 * viaja gratis en la misma petición que ya funciona cada hora sin fallos.
 * Best effort: un fallo aquí nunca debe tocar la respuesta de control.
 */
import { put, head } from '@vercel/blob';
import { calcularControl, consultar, resumir, VENTANA } from './_lib/circuit.mjs';

const HISTORICO_PATHNAME = 'circuit-2026/agenda-historico.jsonl';

async function leerHistorico() {
  try {
    const meta = await head(HISTORICO_PATHNAME);
    const resp = await fetch(meta.url, { cache: 'no-store' });
    if (!resp.ok) return '';
    return await resp.text();
  } catch {
    return '';
  }
}

async function guardarSnapshot() {
  try {
    const { porDia, total } = resumir(await consultar(VENTANA.inicio, VENTANA.fin));
    const linea = JSON.stringify({
      momento: new Date().toISOString(),
      ventana: `${VENTANA.inicio}/${VENTANA.fin}`,
      total,
      porDia
    });
    const previo = await leerHistorico();
    await put(HISTORICO_PATHNAME, previo + linea + '\n', {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/x-ndjson'
    });
  } catch {
    // Best effort a propósito: se pierde un punto de tendencia, nunca la
    // decisión de pausa/activa.
  }
}

export default async function handler(_req, res) {
  res.setHeader('Cache-Control', 'no-store');
  let control;
  try {
    control = await calcularControl();
  } catch (err) {
    // El guardián de Ads ya sabe pausar solo si esto responde algo ilegible
    // o con error — mejor eso que devolver un 200 con datos inventados.
    res.status(502).json({ error: String(err?.message ?? err) });
    return;
  }
  // Se espera a que termine ANTES de responder: en una función serverless
  // el trabajo async lanzado después de mandar la respuesta no tiene
  // garantía de terminar. Booksy responde rápido, así que el coste extra
  // es pequeño y el guardado queda garantizado en vez de "a ver si cuela".
  await guardarSnapshot();
  res.status(200).json(control);
}
