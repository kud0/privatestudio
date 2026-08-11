/**
 * Endpoint en vivo que el guardián de Google Ads (ads-script-guardia.js) lee
 * cada hora para decidir pausa/activa. Sustituye a public/ads-control.json
 * (publicado por git desde el cron local del Mac) por un cálculo en vivo en
 * cada petición — no depende de que nadie haya publicado nada recientemente.
 *
 * GET público, sin caché: UrlFetchApp de Google Ads Scripts no manda cookies
 * ni cabeceras especiales, así que no hace falta autenticación aquí.
 */
import { calcularControl } from './_lib/circuit.mjs';

export default async function handler(_req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const control = await calcularControl();
    res.status(200).json(control);
  } catch (err) {
    // El guardián de Ads ya sabe pausar solo si esto responde algo ilegible
    // o con error — mejor eso que devolver un 200 con datos inventados.
    res.status(502).json({ error: String(err?.message ?? err) });
  }
}
