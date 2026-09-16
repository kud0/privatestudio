# PROJECT_CONTEXT — Private Studio
_Actualizado: 2026-09-16_

## 📖 Empieza aquí
**`src/docs/RUNBOOK-ads.md`** — documento autosuficiente con cuentas, IDs, arquitectura
del circuito, problemas abiertos y cómo hacer cada cosa. Si eres un agente sin contexto,
léelo antes de tocar nada. Este fichero es solo el estado del día.

## Estado
Los tres canales **ON**. Tope acordado: **200 €/mes por plataforma** (~6,58 €/día).
- **Google** (cuenta 608-571-5182): `PS | Search | Barcelona` activa, 6,00 €/día.
- **TikTok** (advertiser 7677347782302351377): `PS | TikTok | Spark | Barcelona` activa.
  Tope de cuenta 6,58 €/día. Auto-pago ON (Visa ····1757).
- **Meta** (cuenta 1043934475117581): `PS | Meta | Traffic | Barcelona` activa, 6,67 €/día.

Gasto del mes: **153,47 €** de 600 € (Google 100,43 · TikTok 20,00 · Meta 33,04).
Ritmo día 16/30 → proyección 320 €/mes.

Panel de ads: https://ps-ads-seven.vercel.app (repo `Vanwida/private-studio-ads`).
Panel de agenda: https://www.barberbarcelona.es/panel-76380b752010.html (este repo).

Recambio de dos Spark de TikTok **guardado, no ejecutado**.

## Última sesión (2026-09-16)
- Auto-pago de TikTok activado y verificado.
- Bajado el tope de cuenta de TikTok de 10 € → **6,58 €/día**. (El ad group no baja de
  20 €: mínimo duro de TikTok, por eso se aplica en el tope de cuenta.)
- Google: reactivadas `"barberia barcelona"` y `"barberia cerca de mi"`, que estaban
  pausadas. La campaña corría prácticamente con una sola keyword viva.
- Mapeado el sistema entero y escrito el runbook.

## 🔴 Problemas abiertos
1. **TikTok sin entrega desde ~9 sep** — "En marcha" pero 0 impresiones / 0 clics.
   Probable causa: se quedó sin saldo. El auto-pago se activó hoy, debería reanudar.
   **Verificar 17–18 sep.** Si sigue a cero, mirar la rama `cursor/tiktok-zero-spend-fix-4bd7`
   del repo `private-studio-ads`.
2. **`VENTANA` congelada en `2026-08-01/2026-08-15`** — hardcodeada en `api/_lib/circuit.mjs:17`
   y `scripts/circuit-2026/booksy-snapshot.mjs:53`. Rompe tendencia, ritmo y calendario.
   No afecta al pausa/activa. Hay que tocar los dos sitios.
3. **`FESTIVOS` caducado** (solo `2026-08-15`). Booksy no distingue festivo de día lleno.
4. Google `PS | Search | Barcelona` sigue "Limited by bid strategy": de 36 keywords solo
   ~8 activas. Pendiente matar la duplicada corrupta `"barberia cerca de mi cerca de mi"`.
5. `META_ACCESS_TOKEN` caducó el 8 sep (overlay de Meta caído). La campaña corre igual.

## ➡️ Siguiente acción
Cuando Alex lo diga: sustituir en TikTok Spark los dos cortos (visagismo
`7616830238613409046` y oferta `7614934939145997590`) por `7658207104217451798`
(pareja no reconoció) y `7613692886114127126` (Private Experience). Se queda el 1:50
`7601837975613295894`. Spark, no re-subir.

## Bloqueantes
- No ejecutar `spark_planificado` hasta OK de Alex.
