# La operación de ads se documenta en otro repo

Este repo es **el site del cliente** (`barberbarcelona.es`). La operación de campañas
—Google, TikTok y Meta— la llevamos nosotros y vive en un repo privado aparte:

**`Vanwida/private-studio-ads` → `RUNBOOK.md`**

Ahí están las cuentas, los IDs, los topes de gasto y los procedimientos. No se replican
aquí a propósito: este repo es público.

## Lo que sí vive en este repo

Las piezas del circuito que tienen que servirse desde `barberbarcelona.es`, porque el
guardián de Google Ads necesita un endpoint público que leer:

| Ruta | Qué es |
|---|---|
| `api/circuit-control.js` | Estado pausa/activa, calculado en vivo. **Público y sin auth a propósito**: lo llama Google Ads Script, que no puede autenticarse |
| `api/circuit-panel-data.js` | Alimenta el panel de agenda |
| `api/circuit-refresh.js` | Guarda el histórico en Vercel Blob. Exige `Bearer CRON_SECRET` |
| `api/_lib/circuit.mjs` | Lógica compartida |
| `scripts/circuit-2026/booksy-snapshot.mjs` | Consulta Booksy |
| `scripts/circuit-2026/ads-script-guardia.js` | Copia de trabajo. **La buena está en el repo de ads** |
| `public/panel-76380b752010.html` | Panel de agenda. Nombre no adivinable: muestra datos del negocio |

El histórico se refresca desde un GitHub Action del repo de ads, no desde ningún
ordenador. Ver `.github/workflows/snapshot-agenda.yml` allí.
