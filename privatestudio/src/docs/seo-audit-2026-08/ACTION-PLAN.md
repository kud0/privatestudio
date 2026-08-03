# Private Studio — Auditoría SEO y plan de acción

**Web:** www.barberbarcelona.es · **Fecha:** 3 de agosto de 2026
**Herramienta:** claude-seo 2.2.4 · 11 agentes especializados · 11 URLs analizadas

---

## SEO Health Score: 59/100

| Categoría | Peso | Score | Aporta |
|---|---:|---:|---:|
| Content Quality | 23% | 60 | 13,80 |
| Technical SEO | 22% | 74 | 16,28 |
| On-Page SEO | 20% | 48 | 9,60 |
| Schema | 10% | 42 | 4,20 |
| Performance (CWV) | 10% | 52 | 5,20 |
| AI Search Readiness | 10% | 68 | 6,80 |
| Images | 5% | 55 | 2,75 |
| **Total** | **100%** | | **58,63 → 59** |

Categorías analizadas aparte, que no entran en la fórmula pero pesan más que ninguna en este negocio: **Local SEO 60/100** y **SXO 73/100**.

### Qué no se pudo medir

Esto acota el valor del informe y conviene tenerlo presente:

- **Sin Google Search Console, CrUX ni PageSpeed** (no hay credenciales). Todas las cifras de rendimiento son de **laboratorio**, no de campo. Lab ≠ lo que Google usa para rankear.
- **Sin volúmenes de búsqueda ni posiciones confirmadas.** Las SERP se leyeron con WebSearch: son señal direccional, no ranking medido.
- **Backlinks en Tier 0** (solo Common Crawl). Sin DA/PA ni spam score. El agente se negó deliberadamente a dar un score numérico en vez de inventarlo.
- Los enlaces de bio de Instagram y Facebook no se pudieron verificar: requieren sesión iniciada.

---

## Los cinco hallazgos que importan

### 1. El nombre del perfil de Google Business incumple la norma de Google

El perfil se llama **"Private Studio - La Mejor Barberia de Barcelona"**. Verificado resolviendo el enlace oficial que usa la propia web:

```
maps.app.goo.gl/g1CY1yPGPptzhyWx7
  → google.com/maps/place/Private+Studio+-+La+Mejor+Barberia+de+Barcelona/
```

La norma de Google ([support.google.com/business/answer/3038177](https://support.google.com/business/answer/3038177)) dice literalmente:

> "Including unnecessary information in your business name isn't permitted, and could result in the suspension of your Business Profile."

Y pone justo este patrón como ejemplo de lo **no** aceptable: *"TD Bank, America's Most Convenient Bank"* frente a *"TD Bank"*.

Para una barbería el GBP **es** el negocio: el map pack trae la mayoría de las reservas. Una suspensión no es un problema de SEO, es quedarse sin canal. Además "La Mejor Barbería de Barcelona" es una afirmación superlativa no sustentada, que agrava.

**Acción:** renombrar a exactamente `Private Studio`. Lo hace Renato, tarda un minuto, es gratis.

---

### 2. Los servicios y las FAQ no existen en el HTML servido

`Services.astro` emite `<h4 data-i18n="serv.corte.premium"></h4>` **vacío**. El nombre del servicio solo vive dentro de un `<script>`, como valor del objeto `ui`. Lo mismo con las 12 FAQ.

| | elementos `data-i18n` vacíos |
|---|---:|
| HTML servido, sin ejecutar JS | **73 de 125** |
| Tras ejecutar JS (Playwright) | **0** |

El matiz importa para no exagerar: **Googlebot renderiza JavaScript y acaba viéndolos.** No estás invisible en Google. Pero:

- **Los crawlers de IA no ejecutan JS** — GPTBot, ClaudeBot, PerplexityBot. Para ChatGPT y Perplexity, Private Studio es una barbería sin catálogo ni precios: solo quedan `25,00 €` y `45min` flotando junto a un titular vacío.
- En Google el contenido pasa por la cola de renderizado: se indexa más tarde y de forma más frágil que el HTML directo.

**El patrón correcto ya está en el repo.** `Hero.astro`, `About.astro` y `Footer.astro` escriben el texto en español inline y usan `data-i18n` solo para cambiar a inglés. `Services.astro` y `FAQ.astro` se saltaron ese patrón.

---

### 3. El hreflang está roto en todo el sitio

Cada página declara la **home** como su alternate `es` y `en`:

```
/blog/que-es-visagismo-guia-completa/   hreflang="es" → https://www.barberbarcelona.es/
                                        hreflang="en" → https://www.barberbarcelona.es/
```

No son traducciones de esa página, falta el self-reference y falta `x-default`. Los 4 pares reales del blog (`que-es-visagismo-guia-completa` ↔ `what-is-visagism-complete-guide`, etc.) no están enlazados entre sí. Y **los posts en inglés se sirven con `<html lang="es">`** — `Layout.astro:19` lo tiene hardcodeado.

**Buena noticia sobre el coste:** el dato ya existe. `src/content/config.ts:12` define `lang: z.enum(['es','en'])` y los 9 posts lo rellenan. Solo hay que consumirlo.

---

### 4. El schema declara un tipo que no existe y ubica el local a 74 metros

- **`"@type": "BarberShop"` no existe en schema.org.** Verificado contra el vocabulario oficial (`schemaorg-current-https.jsonld`): bajo `HealthAndBeautyBusiness` solo existe `HairSalon`. `schema.org/BarberShop` → 404.
- **Coordenadas desviadas 74 m.** El schema declara `41.3925, 2.1530`. El pin real del GBP es `41.3918882, 2.152643` y el geocoding de OSM da `41.3918967, 2.1526211`: las dos fuentes independientes coinciden entre sí con **2,1 m** de diferencia. El error está en el schema. En una manzana del Eixample, 74 m es el portal equivocado.
- **`SearchAction` falso:** declara una búsqueda en `/?q={search_term_string}` que no existe. Verificado: el HTML de `/` y de `/?q=test` es byte-idéntico, mismo MD5.

Y falta lo que sí aportaría valor: los **23 servicios con precio** están en `Services.astro:48-106` y no aparecen en el schema.

> **Decisión documentada — NO implementar `aggregateRating` ni `review`.** La política de Google dice que si la entidad reseñada controla las reseñas sobre sí misma, sus páginas con `LocalBusiness` u `Organization` **no son elegibles** para la función de estrellas, y lo extiende a widgets de terceros embebidos. `HairSalon` hereda de `LocalBusiness`. Implementarlo daría cero estrellas y expondría a acción manual. Las estrellas reales salen del map pack vía GBP. Queda escrito para que nadie lo "arregle" dentro de seis meses.

---

### 5. La home en móvil está en 52/100 por 13,7 MB de vídeo

LCP **5,8 s** (LAB, Lighthouse 12.8.2). El elemento LCP es el vídeo del hero, **sin `poster`**. Desglose: TTFB 931 ms (16%), render delay **4.919 ms (84%)**.

Hay **tres** `<video>`, ninguno con `poster` ni `preload`:

| elemento | fichero | peso |
|---|---|---:|
| `reel-mobile` | `renato-dinamico-web.mp4` | 8,0 MB |
| `reel-desktop` | `renato-dinamico-web.mp4` | (mismo, cachea) |
| About | `reni_about_1.mp4` | 5,7 MB |

El navegador descarga ambos en móvil aunque `lg:hidden` oculte el de desktop: **el CSS no impide la descarga de un `<video>`**.

**El dato más útil es negativo: GTM no es el problema.** El propio audit `third-party-summary` de Lighthouse le atribuye **3 ms** de los 963 ms de bloqueo total. El cuello de botella es el decode del vídeo. Evita perder el tiempo donde la intuición te llevaría.

Desktop está en 91/100. Toda la diferencia es CPU y vídeo.

---

## Lo que ya está bien (verificado, no tocar)

- **El CTA de reserva de la home está resuelto.** Barra fija de 56×375 px visible sin scroll en móvil, muy por encima del mínimo de 48 px. Cero fricción para reservar.
- **CLS = 0** en las 4 combinaciones medidas.
- **robots.txt abierto a los crawlers de IA.** Verificado en vivo con UA de GPTBot, ClaudeBot, PerplexityBot y Google-Extended: los 4 devuelven 200, mismo etag y content-length que un UA normal. Sin firewall de Vercel bloqueando.
- **Los 4 pares ES/EN del blog son traducciones reales** con paridad estructural verificada una a una. No es contenido espejo ni girado.
- **NAP interno 100% coherente** en Footer, Navbar, FAQ y schema.
- **Sin herencia de dominio problemática:** Wayback no tiene ni un snapshot previo. Descarta parking, spam o negocio anterior.
- **Canonicales autorreferenciales correctos**, incluido `/blog` vs `/blog/`.
- El bug antiguo de `layout_issue.png` ya no se reproduce.

---

## Plan de acción

### Fase 0 — Riesgo abierto. No es código, lo hace Renato

| Acción | Por qué |
|---|---|
| **Renombrar el GBP a "Private Studio"** | Riesgo de suspensión del canal principal de reservas |
| Reclamar o dar de baja el listing de **Fresha** | Da 404 en vivo y se llama "BARBERÍA \| PRIVATE STUDIO \| MANICURA RUSA" |
| Verificar el **horario del sábado** | La web dice 11:00-19:00; dos fuentes indexadas dicen 10:00-16:00 (confianza media) |
| Aportar **6 fotos de trabajos** + 1 foto por post | Es la mayor brecha de E-E-A-T del sitio |

### Fase 1 — Críticos de código (semana 1)

1. `@type` → `HairSalon` y coordenadas → `41.3918882, 2.152643` *(`Layout.astro`)*
2. Eliminar el `potentialAction`/`SearchAction` falso
3. **Texto inline en `Services.astro` y `FAQ.astro`** — los 23 servicios, sus precios y las 12 FAQ al HTML servido
4. **hreflang por página** desde `frontmatter.lang`, con self-reference y `x-default`; usar ese `lang` en `<html lang>`
5. **`poster` en los 3 `<video>`** + `preload="none"` en el de About
6. `noindex` en `review.astro`
7. **Un solo `<h1>`** en la home + línea descriptiva con keywords bajo el hook
8. Corregir el `min-height` del hero que provoca el solape en desktop

### Fase 2 — Estructura (semanas 2-3)

Renderizar `Gallery.astro` con las fotos reales · `hasOfferCatalog` + `areaServed` + Booksy en `sameAs` · `Article` → `BlogPosting` con `image` y `dateModified` · `BreadcrumbList` · matriz de enlazado interno entre los 9 posts · subir los 4 tap targets a 48 px · CTA fijo también en el blog · `vercel.json` con cabeceras de seguridad · migrar a `@astrojs/sitemap` con `lastmod` real · página de autor de Renato · alta en Páginas Amarillas.

### Fase 3 — Contenido y autoridad (mes 2)

- **`/visagismo-masculino-barcelona` como página de servicio**, no como post. `visagismo` a secas trae peluquerías femeninas; solo `visagismo masculino Barcelona` trae la audiencia correcta, y ahí Wess Barber ya tiene dos páginas dedicadas.
- **Congelar el patrón de blog actual.** Las 5 consultas informacionales probadas (qué es el visagismo, cómo cuidar la barba, fade vs taper, tendencias 2026 ES/EN) tienen SERP 100% de L'Oréal, Gillette, Philips, Druni y medios de estilo de vida. Cero resultados de Barcelona. La batalla no es ganable y, aunque se ganara, quien busca "cómo cuidar la barba" desde Sevilla no reserva en Muntaner 172.
- Retomar publicación con las **7 piezas priorizadas** de `findings/cluster.md`, todas de intención comercial local.
- **Dejar de traducir contenido de negocio al inglés.** Reservarlo para el cluster expat, que sí es una SERP real y distinta donde Private Studio no aparece.
- **Outreach a las listículas locales.** Las consultas de barrio las dominan listículas y agregadores, no homes individuales. Es además de donde beben Perplexity y los AI Overviews. URLs verificadas en vivo (todas HTTP 200 el 2026-08-03), por orden de prioridad:

  | # | Dónde | Estado | Cómo |
  |---|---|---|---|
  | 1 | [`barcelona.place/join/`](https://barcelona.place/join/) | **Alta automática** | Máxima prioridad, menor fricción. Su listícula *"Las 12 mejores barberías del Eixample"* ([`/barberia-eixample/`](https://barcelona.place/barberia-eixample/)) **no incluye a Private Studio** — verificado con grep sobre el HTML, 0 coincidencias |
  | 2 | [`barbershopmap.com/barberias/barcelona`](https://barbershopmap.com/barberias/barcelona) | No aparece | Sin alta automática, contacto manual |
  | 3 | Páginas Amarillas | Ausente | Gratis y de alta autoridad. Competidores de la misma calle sí están (Muntaner 113 y 176) |
  | 4 | Fresha | **Ficha rota** | Arreglar la existente (404) antes de crear nada nuevo |
  | 5 | Booksy | Ya vivo | Solo falta añadirlo al `sameAs` |
  | 6 | [`timeout.com/barcelona`](https://www.timeout.com/barcelona) | Outreach editorial | Ángulo expat |
  | 7 | [`barcelona-metropolitan.com`](https://www.barcelona-metropolitan.com) | Outreach editorial | Mismo ángulo expat |
  | 8 | Instagram | No verificable por HTTP | Confirmar a mano que el bio-link apunta al dominio correcto |

  **Descartados con evidencia, no perder tiempo:** 11870.com y Cylex.es (403 de Cloudflare), Cambra de Comerç, Ajuntament/comerç y guia.barcelona.cat (vivos pero sin directorio aplicable a un negocio individual), barcelonacomerc.cat y eixample.cat (no resuelven).

### Fase 4 — Medición (continuo)

- **Verificar Google Search Console.** Sigue pendiente desde febrero, cuando se anotó que hacía falta la contraseña del dominio. Verificado contra la documentación de Google: eso **solo aplica al método DNS**. Hay cuatro que no tocan el dominio — archivo HTML, etiqueta meta, Google Analytics y Google Tag Manager. El sitio ya sirve GTM (`GTM-WSZS5CV5`) y `Layout.astro:28` ya tiene el hueco de la meta preparado y comentado. **No es una tarea de Renato: se resuelve desde el código.**
- `GOOGLE_API_KEY` para CrUX y PageSpeed reales en vez de solo LAB.
- Clave gratuita de Moz para pasar el análisis de enlaces de Tier 0 a Tier 1.
- **Baseline de drift ya capturada** el 2026-08-03. Comparar tras cada fase con `claude-seo run drift_compare.py`.

---

## Índice de informes detallados

Cada uno con evidencia línea por línea, fichero:línea y el fix concreto:

| Informe | Score | Contenido |
|---|---|---|
| `findings/technical.md` | 74/100 | 9 categorías técnicas, `vercel.json` listo |
| `findings/content.md` | 60/100 | E-E-A-T, recuento real de palabras por post |
| `findings/schema.md` | 42/100 | JSON-LD corregido listo para pegar |
| `findings/performance.md` | 52/100 | Lighthouse, desglose de fases de LCP |
| `findings/geo.md` | 68/100 | Crawlers de IA, citabilidad |
| `findings/local.md` | 60/100 | GBP, NAP, citaciones |
| `findings/sxo.md` | 73/100 | SERP backwards, personas |
| `findings/cluster.md` | — | Arquitectura + matriz de enlazado + 7 piezas |
| `findings/sitemap.md` | 60/100 | Diff de migración a `@astrojs/sitemap` |
| `findings/visual.md` | — | Tap targets medidos, solape del hero |
| `findings/backlinks.md` | sin score | Tier 0 declarado, sin métricas inventadas |

`screenshots/` — home, blog index y post, en móvil y desktop, viewport y full page.
`audit-data.json` — envoltorio estructurado para generar el PDF.
