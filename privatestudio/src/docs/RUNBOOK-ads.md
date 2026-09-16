# RUNBOOK — Sistema de Ads de Private Studio

_Última verificación en vivo: 2026-09-16 18:45 (Madrid)._

Documento autosuficiente. Si eres un agente sin contexto previo, esto es todo lo que
necesitas para operar el sistema. Lee entero antes de tocar nada.

---

## 0. Qué es esto en una frase

Private Studio es una barbería en Barcelona (Muntaner 172, 4 barberos, cortes de 35 min).
Se anuncia en **tres canales — Google, TikTok y Meta — con un tope de 200 €/mes cada uno**.
Las reservas van a **Booksy**. Hay un sistema que vigila la ocupación real de la agenda y
**apaga los anuncios cuando no quedan huecos que vender**.

La idea de fondo: no pagar por tráfico cuando el estudio está lleno.

---

## 1. Las tres cuentas de anuncios

| Canal | Identificadores | Campaña | Tope/día | Tope/mes |
|---|---|---|---|---|
| **Google Ads** | cuenta `608-571-5182`, campaña ID `22697186771` | `PS \| Search \| Barcelona` | 6,00 € | 180 € |
| **TikTok Ads** | advertiser `7677347782302351377`, BC `7677347802834960400`, ad group `1874512967328114` | `PS \| TikTok \| Spark \| Barcelona` | 6,58 € (tope de cuenta) | 200 € |
| **Meta** | ad account `1043934475117581`, business `573906475814232` | `PS \| Meta \| Traffic \| Barcelona` | 6,67 € | 200 € |

Regla de presupuesto: **200 €/mes por canal → 6,58 €/día** (200 ÷ 30,4).

### Peculiaridad de TikTok que hay que conocer
El presupuesto del **ad group no baja de 20 €/día** — es un mínimo duro de la plataforma,
no una config nuestra. Por eso el límite real se aplica en el **tope diario de cuenta**
(Tools → Billing → Payment → Budget → Edit), que es el que manda. Está en **6,58 €/día**.
Si ves 20 € en el ad group, no es un error: es el suelo de TikTok.

Pago de TikTok: **automático**, Visa ····1757, dispara al llegar a 5 € de gasto o el 1 de cada mes.

---

## 2. Los dos paneles (no confundirlos)

Existen **dos** cosas distintas llamadas "panel". Es la confusión más fácil de cometer.

### 2.1 Panel de ADS — el principal
- **URL:** https://ps-ads-seven.vercel.app
- **Repo:** `Vanwida/private-studio-ads` en GitHub (**NO es este repo**)
- **Proyecto Vercel:** `ps-ads` (`prj_cfzM8j68jirwkw4QP37E5mvoNsHz`), team `vanwidas-projects`
- **Qué muestra:** gasto por canal vs. tope, ocupación del estudio, calendario 14 días,
  estado de cada campaña, creatividades activas.
- **Cómo se alimenta:** endpoints propios `/api/tiktok`, etc., leyendo las APIs de los
  tres canales en vivo.
- Los últimos deploys los hizo un agente de Cursor sobre la rama `pr-1`, no sobre `main`.

### 2.2 Panel de AGENDA — secundario
- **URL:** https://www.barberbarcelona.es/panel-76380b752010.html
- **Repo:** este (`privatestudio`), proyecto Vercel `privatestudio`
- **Fichero:** `public/panel-76380b752010.html`, generado desde
  `scripts/circuit-2026/panel-plantilla.html`
- El nombre es deliberadamente no adivinable: muestra datos de negocio del cliente.

---

## 3. El "circuito": cómo se apagan solos los anuncios

```
Booksy (agenda real)
      │
      ▼
booksy-snapshot.mjs  ── cron local en el Mac de Alex, cada 2 h
      │                 0 9,11,13,15,17,19,21 * * *
      ├─→ public/ads-control.json
      ├─→ regenera el panel de agenda
      └─→ git commit + push  →  Vercel redeploy
                                      │
                                      ▼
                        /api/circuit-control  (público, sin auth, no-store)
                                      │
                                      ▼
                        Google Ads Script "guardia" ── cada hora
                                      │
                                      ▼
                        pausa / activa PS | Search | Barcelona
```

### El guardián (`scripts/circuit-2026/ads-script-guardia.js`)
Google Ads Script, `scriptId 12071869`, frecuencia **Hourly**. Cada hora decide:

- Fuera de 9:00–19:00 Madrid → **pausa**
- El control de Booksy dice que no hay huecos → **pausa**
- Gasto de hoy ≥ presupuesto (`MARGEN_DIARIO = 1.0`) → **pausa**
- Repara el ad schedule a 9–19 los 7 días si alguien lo tocó
- Avisa por email a alexsole@gmail.com al llegar al 80 % del presupuesto

**Salvaguarda importante:** si falla la red, **no pausa** por agenda. Prefiere seguir
gastando a apagarse por un error de conexión.

### Los commits automáticos
Los commits `control: campana activa (N citas libres en los proximos 2 dias abiertos)`
los genera `booksy-snapshot.mjs` en cada run. Autor: `Vanwida`. Si dejan de aparecer,
**el cron ha dejado de correr**.

---

## 4. Ficheros que importan

| Ruta | Qué es |
|---|---|
| `scripts/circuit-2026/ads-script-guardia.js` | El guardián. Se pega a mano en Google Ads → Tools → Scripts |
| `scripts/circuit-2026/booksy-snapshot.mjs` | Consulta Booksy (negocio `90283`, variante `2430520`, 35 min). Flags: `--resumen`, `--sin-push` |
| `scripts/circuit-2026/agenda-historico.jsonl` | Histórico. Línea: `{momento, ventana, total, porDia, porFranja}` |
| `scripts/circuit-2026/snapshot.log` | Log de cada run del cron |
| `scripts/circuit-2026/panel-plantilla.html` | Plantilla del panel de agenda |
| `api/circuit-control.js` | **Público, sin auth.** Lo consume el guardián cada hora |
| `api/circuit-panel-data.js` | Alimenta el panel de agenda |
| `api/circuit-refresh.js` | Cron Vercel diario `0 8 * * *`. Exige `Bearer CRON_SECRET` |
| `api/_lib/circuit.mjs` | Lógica compartida del circuito |
| `src/docs/bitacora-circuit-2026.md` | Bitácora histórica (1170 líneas). Contexto de decisiones pasadas |

**Variables de entorno** (`.env.local`, solo nombres — nunca las imprimas):
`BLOB_READ_WRITE_TOKEN`, `CRON_SECRET`, `VERCEL_OIDC_TOKEN`, `VERCEL_TOKEN`,
`META_ACCESS_TOKEN`, `META_AD_ACCOUNT_ID`, `META_APP_ID`, `META_BUSINESS_ID`,
`META_SYSTEM_USER_ID`.

---

## 5. Estado a 2026-09-16 y problemas abiertos

### Lo que funciona
- Las tres campañas están **ON**.
- El cron corrió por última vez hoy a las **17:00** ✅
- El control pausa/activa **funciona correctamente** (usa días abiertos rodantes,
  no la ventana rota que se describe abajo).
- Gasto del mes: **153,47 €** de 600 € (Google 100,43 · TikTok 20,00 · Meta 33,04).
  Ritmo proyectado día 16/30: 320 €/mes. Muy por debajo del tope.

### 🔴 TikTok lleva desde ~9 sep sin entregar
Estado "En marcha" pero **0 impresiones y 0 clics**. Solo 20 € gastados en todo el mes.
Un agente de Cursor abrió la rama `cursor/tiktok-zero-spend-fix-4bd7` con commits
"TikTok: expose campaign/adgroup/ad statuses; gated re-enable" — el problema estaba
identificado pero **no consta resuelto**.

Hipótesis más probable: la cuenta se quedó **sin saldo** (estaba a 0,00 €) y TikTok
detiene la entrega de auction ads cuando eso pasa. El **pago automático se activó
hoy 16/09**, así que la entrega debería reanudarse sola. **Verificar en 24–48 h**:
si sigue a 0 impresiones, el problema es otro y hay que mirar la rama de Cursor.

### 🔴 `VENTANA` congelada en agosto
Hardcodeada **en dos sitios**: `api/_lib/circuit.mjs:17` y
`scripts/circuit-2026/booksy-snapshot.mjs:53`, ambos con `2026-08-01/2026-08-15`.

Consecuencias reales: cada línea nueva del histórico sale con `"total":0,"porDia":{}`,
`citas_ventana: 0`, el log repite `huecos en la ventana: 0 / sin cambios`, y el
calendario del panel de agenda muestra 15 días de agosto a cero.

**No afecta al pausa/activa.** Lo que está roto es la tendencia, el ritmo y las
reservas del día. Al arreglarlo hay que tocar **los dos sitios**.

### 🟡 Otros
- `FESTIVOS` solo contiene `2026-08-15` → **caducado**. Booksy devuelve lo mismo para
  día lleno, cerrado y festivo, así que los festivos hay que declararlos a mano o el
  sistema creerá que está lleno.
- `REFRESH_SECRET = 'REEMPLAZAR_CON_EL_CRON_SECRET'` sin sustituir
  (`ads-script-guardia.js:59`) → esa llamada devuelve 401. Inocuo hoy: el guardado
  migró a `circuit-control`.
- `ads-control.json` dice `presupuesto_diario: 20`, pero Google está a 6 €/día.
- 4 ficheros modificados sin commitear, incluido `ads-script-guardia.js`.
- **Google `PS | Search | Barcelona` sale "Limited by bid strategy"**: de 36 keywords
  solo ~8 están activas. Queda pausada y corrupta `"barberia cerca de mi cerca de mi"`
  (18 impresiones, 0 clics) — conviene matarla, compite con la buena.

---

## 6. Trampas conocidas (aprendidas a base de golpes)

1. **El cron vive en el Mac de Alex.** Si el Mac duerme, se salta runs enteros sin aviso
   ni reintento. Fue la causa raíz de un incidente el 12 ago. Por eso el control se
   migró a serverless: el guardián de Google llama a `/api/circuit-control` en vivo y no
   depende del cron.
2. **Un Google Ads Script que use `SpreadsheetApp` o `MailApp` exige passkey de Alex.**
   Añadir uno de esos servicios tumba el script entero hasta que él reautoriza a mano.
   No es automatizable — no lo intentes.
3. **Campaña sin fecha de fin** fue el fallo más caro registrado. Revisa siempre las
   fechas al crear.
4. El guardián estuvo ~10 h sin proteger nada el 4 ago sin que nadie se enterara.
   Si tocas el script, confirma en el log que vuelve a correr.
5. Casi la mitad del gasto de Google era **tráfico de marca** (gente que ya buscaba
   Private Studio). Hallazgo pendiente de decidir con Reni: pagar por tu propia marca
   puede ser tirar dinero o puede ser defensivo. No está decidido.

---

## 7. Cómo hacer las cosas

### Cambiar el tope de gasto de TikTok
Ads Manager → Tools → Billing → Payment → tarjeta **Budget** → Edit → Custom → Daily → importe → Confirm.
**No** lo intentes en el ad group: no baja de 20 €.

### Cambiar el tope de Google
Campaigns → fila de la campaña → columna Budget → lápiz.

### Cambiar el tope de Meta
Ads Manager → Conjuntos de anuncios → columna Presupuesto.

### Forzar un refresco de la agenda
```bash
cd scripts/circuit-2026 && node booksy-snapshot.mjs --resumen
```
Sin `--sin-push` hará commit y push, lo que redespliega Vercel.

### Ver si el circuito está vivo
```bash
git log --oneline -5   # ¿hay commits "control: campana activa" recientes?
tail -20 scripts/circuit-2026/snapshot.log
```

---

## 8. Reglas de operación

- **Nunca** entres credenciales ni confirmes pagos por automatización de navegador.
  Cargar saldo lo hace Alex a mano. La API de TikTok solo mueve saldo **ya existente**
  entre Business Center y cuenta de anuncios (`BC Transfer`); no puede iniciar un cargo
  a tarjeta.
- El tope de 200 €/mes por canal es **decisión de Alex**, no lo cambies sin pedirlo.
- Antes de dar por bueno un cambio de presupuesto, **verifícalo en pantalla**: varias
  interfaces aceptan el valor y no lo guardan.
- `api/circuit-control.js` es **público y sin auth** a propósito (lo llama Google Ads
  Script, que no puede autenticarse fácil). No le metas auth sin tener en cuenta eso.
