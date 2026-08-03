# Performance & Core Web Vitals — barberbarcelona.es

Medido: 2026-08-03. Todas las cifras son **LAB** (Lighthouse 12.8.2 vía Unlighthouse
0.13.5, Chromium local). **No hay datos de campo** (CrUX / GSC / PageSpeed API):
no hay credenciales de Google API configuradas en este entorno, así que
`lcp_subparts.py` (que consulta CrUX) falla con `Error: Google API key not
configured`. Lab ≠ lo que Google usa para rankear (que es CrUX de 28 días de
usuarios reales). Todo lo de abajo es una foto de un único run, no una
distribución de percentiles reales.

Métrica de responsividad: se usa **INP** en la nomenclatura, nunca FID. Pero
INP real requiere una interacción de usuario real o datos de campo — ningún
lab tool mide INP sin ella. Como proxy lab se usa **TBT (Total Blocking
Time)** + recuento de *long tasks*, que es el proxy estándar recomendado por
web.dev cuando no hay INP de campo.

Caveat de metodología: el run mobile usó `throttlingMethod: simulate`,
red limitada (~1.6 Mbps, RTT 150 ms — perfil "Slow 4G"), pero
**`cpuSlowdownMultiplier: 1`** (sin ralentizar CPU) porque Lighthouse se
ejecutó en un Mac rápido, no en un Android real. Un móvil de gama media real
(el tráfico objetivo de esta barbería) probablemente da resultados **iguales o
peores** a los de aquí, no mejores.

---

## Score 0-100 de Performance (categoría Lighthouse, LAB)

| Página | Mobile | Desktop |
|---|---|---|
| Home `/` | **52 — Pobre** | 91 — Bien |
| Blog `/blog/como-cuidar-barba-en-casa/` | **74 — Necesita mejora** | 95 — Bien |

Headline recomendado: **52/100 (mobile, home)** — el tráfico es
mayoritariamente móvil y es la página de entrada principal.

Nota técnica: el wrapper `unlighthouse_run.py --device desktop` del plugin
claude-seo 2.2.4 tiene un bug — pasa `--device desktop` a `unlighthouse-ci`,
pero esa CLI solo acepta el flag booleano `--desktop`/`--mobile`, no
`--device <valor>`. Con `--device desktop` el flag se ignora silenciosamente
y el run sigue siendo mobile (confirmado leyendo `configSettings.formFactor`
y `screenEmulation.width` del `lighthouse.json` resultante: salió `"mobile"`
/ `412px` con `--device desktop`). Los números "Desktop" de esta tabla vienen
de invocar `npx unlighthouse-ci --desktop` directamente (bypass del wrapper),
verificado con `configSettings.formFactor: "desktop"`, `width: 1350`.

---

## Findings

### 1. [CRÍTICO] Home (mobile): LCP 5.8 s — el elemento LCP es el vídeo hero sin `poster`
- **Evidencia:** `largest-contentful-paint` = 5,849 ms (score 0.15/1, umbral "bueno" ≤2,500 ms). Elemento LCP: `<video id="reel-mobile" fetchpriority="high">` (`section.bg-black > div.lg:hidden > div.relative > video#reel-mobile`). Desglose de fases (Lighthouse trace, no CrUX): TTFB 931 ms (16%), Render Delay 4,919 ms (**84%**).
- **Causa:** el navegador no puede pintar el elemento LCP hasta decodificar el primer frame del vídeo `/images/renato-dinamico-web.mp4` (~5.3–5.6 MB transferidos), y no hay `poster` que dé un pintado instantáneo.
- **Fix:** añadir `poster="/images/renato-dinamico-poster.webp"` (frame estático comprimido, <50 KB) a los `<video>` de `src/components/Hero.astro:10-17` (mobile) y `:93-100` (desktop). Esto da un candidato LCP inmediato mientras el vídeo decodifica en segundo plano. Idealmente combinar con `preload="none"` + carga condicional (punto 3).

### 2. [CRÍTICO] Home: 11.6 MB transferidos en la carga inicial — ambos vídeos hero (mobile+desktop) y el vídeo de la sección "About" se descargan siempre, independientemente del viewport
- **Evidencia:** `total-byte-weight` = 11,603–11,881 KiB tanto en mobile como en desktop. Los 3 mayores recursos en ambos runs: `reni_about_1.mp4` (~5.5 MB), `renato-dinamico-web.mp4` (~5.4–5.6 MB) — juntos son el 95% del peso de la página.
- **Causa:** `div.lg:hidden` / `div.hidden.lg:block` solo controla `display:none` vía CSS — no evita que el navegador precargue el `<video>` que queda oculto. Por tanto en desktop se descarga también el vídeo mobile (y viceversa), y el vídeo de About (`src/components/About.astro:69-77`, sin `preload="none"` ni carga diferida) se descarga entero aunque esté below-the-fold.
- **Fix:** (a) cargar solo el vídeo del breakpoint activo con JS (`matchMedia` + asignar `src` dinámicamente) en vez de ocultar por CSS los dos `<video>` de `Hero.astro`; (b) poner `preload="none"` en el vídeo de `About.astro:69` y cargarlo con `IntersectionObserver` solo cuando entra en viewport. Esto puede recortar el payload inicial de ~11.6 MB a ~5.5 MB en el peor caso (un solo vídeo hero + nada de About hasta hacer scroll).

### 3. [ALTO] Home (mobile): TBT 963 ms — riesgo alto de INP pobre
- **Evidencia:** `total-blocking-time` = 963 ms (score 0.29/1, umbral "bueno" ≤200 ms). `max-potential-fid` = 727 ms. 4 *long tasks* detectadas, 3 de ellas **"Unattributable"** (727+289+234 ms) — es decir, no atribuibles a un script concreto, consistentes con decodificación/pintado del vídeo autoplay en el hilo principal.
- **Importante:** el propio audit `third-party-summary` de Lighthouse mide que GTM+gtag solo bloquean el hilo principal **3 ms** de esos 963 ms. El cuello de botella de responsividad **no es GTM**, es el trabajo de vídeo/render en el hilo principal.
- **Fix:** mismo fix que el punto 1/2 — reducir el trabajo de decodificación de vídeo en carga inicial (poster + carga condicional) reduce directamente TBT/long tasks, no solo LCP.

### 4. [ALTO] Blog (mobile): LCP 3.1 s — "Necesita mejora", dominado por Render Delay, no por red
- **Evidencia:** `/blog/como-cuidar-barba-en-casa/` → LCP 3,052 ms (score 0.76/1, umbral bueno ≤2,500 ms). Elemento LCP: el `<h1>` del artículo (texto, no imagen). Fases: TTFB 618 ms (20%), Render Delay 2,434 ms (**80%**).
- **Causa probable:** con un elemento LCP de texto, un Render Delay del 80% normalmente indica CSS/recursos render-blocking o trabajo de hidratación antes del primer pintado útil. `render-blocking-resources` en home ya señala `_astro/_slug_.PKuhYB-G.css` (9.7 KB, ~150 ms de ahorro estimado) como bloqueante — mismo patrón probable en la plantilla de blog.
- **Fix:** revisar el CSS crítico de la plantilla de post (`src/pages/blog/[slug].astro` o equivalente) para inlinear solo el crítico y diferir el resto; en desktop (sin CPU throttling) el mismo H1 pinta en 1.2 s, así que el margen de mejora en mobile es real, no solo ruido de CPU.

### 5. [MEDIO] Sin `<link rel="preconnect">` a dominios de terceros — 0 preconnects en todo el `<head>`
- **Evidencia:** `src/layouts/Layout.astro` (líneas 20-125, todo el `<head>`) no contiene ningún `<link rel="preconnect">` ni `dns-prefetch`, pese a cargar scripts desde `www.googletagmanager.com` en dos componentes distintos (`GoogleTagManager.astro` y `MedicionReservas.astro`).
- **Fix:** añadir en `src/layouts/Layout.astro` antes de `<GoogleTagManager />` (línea 49):
  `<link rel="preconnect" href="https://www.googletagmanager.com">`. Ahorro típico: 100-300 ms de RTT/TLS handshake solapado en vez de secuencial (network-rtt del audit ya mide 17-96 ms de RTT extra a orígenes de Google que hoy se pagan en serie).

### 6. [MEDIO] Doble carga de tags de Google Ads — GTM + gtag.js redundante
- **Evidencia:** `total-byte-weight`/`unused-javascript` muestra **dos** scripts casi idénticos: `gtag/js?id=AW-16802951890` (183 KB, 34% sin usar) y `gtag/js?id=AW-16802951890&cx=c&gtm=4e67t1` (182 KB, 65% sin usar) — cargados además del contenedor GTM (112 KB). Total combinado de tags de Google: ~480 KB transferidos.
- **Causa:** `src/components/MedicionReservas.astro` carga su propio `<script src=".../gtag/js?id=AW-...">` en paralelo al contenedor GTM que ya se inyecta desde `GoogleTagManager.astro`, en vez de disparar la conversión de Google Ads *dentro* de GTM (tag nativo "Google Ads Conversion Tracking").
- **Fix:** mover la conversión `AW-16802951890/JIb2CN2vr9ocENLlosw-` a un tag dentro del contenedor GTM (`GTM-WSZS5CV5`) y eliminar el `<script src="...gtag/js?id=AW-...">` de `MedicionReservas.astro:26`. Evita cargar y parsear un segundo runtime de gtag.js casi idéntico.

### 7. [BAJO] `preload_check.py` — sin Speculation Rules, LCP sin preload explícito
- **Evidencia:** Home → score 75/100 (herramienta propia, no es el score de Performance de Lighthouse): `preload_hints: 0`, `speculation_rules.inline_blocks: 0`. Blog → score 50/100: `lcp_resource_hints.fetchpriority_high: 0`.
- **Fix:** opcional/bajo impacto — añadir `<script type="speculationrules">` con prefetch de las rutas de navegación más comunes (home → reserva, home → blog) para next-navigation casi instantánea. No urgente comparado con los puntos 1-4.

### 8. [INFORMATIVO] CLS = 0 en las 4 combinaciones medidas (home/blog × mobile/desktop) — sin acción necesaria
- **Evidencia:** `cumulative-layout-shift` = 0 (score 1.0) en los 4 runs. Bien resuelto: las animaciones de headline rotativo en `Hero.astro` usan `position: absolute` + `opacity`, no reflow.

### 9. [INFORMATIVO] Imágenes servidas hoy ya están en WebP; el problema de peso está en vídeo, no en imágenes
- **Evidencia:** `modern-image-formats`, `uses-optimized-images`, `efficient-animated-content` → score 1.0 en todos los runs (sin hallazgos). Inventario de `public/images/`: los productos/logos activos (`products.webp` 21 KB, `smtn-logo.webp` 99 KB, 3× `stmnt-*.webp` 8-14 KB, `ps-logo3.png` 13.5 KB) están razonablemente optimizados.
- **Aparte (no bloquea el score de Performance porque no se descargan si nadie los enlaza, pero infla el peso del repo/despliegue):** se detectaron **~196 MB de vídeo huérfano** en `public/images/` sin ninguna referencia en `src/` — `renato-dinamico.mp4` (68.7 MB), `renato-subtitulado.mp4` (67.4 MB), `reni_about_1.mov` (13.9 MB), `herovideo.mp4` (24.4 MB), `hero_test.MP4` (15 MB), `video.mp4` (4.4 MB) — y una imagen huérfana `889045c8-3414-475e-993c-b57b9e4d55b9.png` (2.4 MB), además de `family.png` (615 KB) referenciado en `src/components/Brands.astro:7` como `bgImage` pero nunca usado en el template. Recomendación (housekeeping, no Performance/CWV per se): borrarlos del repo/deploy.

---

## Resumen ejecutivo (para el informe agregado)

**Score Performance (LAB, sin datos de campo):** Home mobile **52/100** (Pobre) · Home desktop 91/100 · Blog mobile 74/100 · Blog desktop 95/100.

El problema no es GTM ni las imágenes (ya en WebP) — es que la home carga
**tres vídeos de barbero en autoplay simultáneamente** (~11.6 MB) sin
`poster`, sin `preload="none"` y sin distinción mobile/desktop a nivel de
red, lo que produce a la vez el LCP pobre (5.8 s en mobile) y el TBT pobre
(963 ms, riesgo de INP) de la home. El blog es sólido salvo un LCP de texto
"necesita mejora" en mobile (3.1 s) atribuible a render-blocking CSS, no a
terceros. CLS es perfecto en todas partes.
