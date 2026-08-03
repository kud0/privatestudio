# GEO / AI Search Readiness — Private Studio (barberbarcelona.es)

Fecha: 2026-08-03
Alcance: accesibilidad para crawlers de IA, citabilidad a nivel de pasaje, señales de marca fuera del sitio.
Metodología: lectura de código fuente (`src/`), build estático (`dist/`), `curl` contra el dominio en producción con distintos user-agents, y `WebSearch` para señales externas. Sin acceso a API de ChatGPT/Perplexity — no se simula ningún resultado de esas herramientas.

## AI Search Readiness Score: 68/100

Desglose (metodología propia, no un estándar de la industria):

| Categoría | Puntos | Motivo |
|---|---|---|
| Accesibilidad para crawlers | 25/25 | robots.txt totalmente abierto, sitio estático (Astro `output: "static"`), sin bloqueos de edge/firewall verificados en vivo |
| Citabilidad a nivel de pasaje | 16/35 | Blog y "Quiénes somos" fuertes; FAQ y catálogo de servicios invisibles como texto en el HTML estático |
| Datos estructurados | 11/15 | LocalBusiness y FAQPage completos; falta Service/Offer para el catálogo de precios |
| Señales de marca fuera del sitio | 9/15 | Domina el resultado orgánico de la query objetivo; sin evidencia de aparición en listículas editoriales de terceros ("mejores barberías de Barcelona") |
| Frescura / E-E-A-T | 7/10 | Fundador nombrado, fecha de fundación, contacto real, blog con fechas recientes; sin schema Person para el autor |

---

## Hallazgos

### 🔴 CRÍTICO — El catálogo de servicios (nombres, descripciones y precios) es invisible para crawlers de IA

**Evidencia:** `src/components/Services.astro` renderiza cada nombre y descripción de servicio con `data-i18n={...}` sin texto de respaldo (fallback) en el markup de Astro. El build estático confirma que quedan vacíos:

```html
<!-- dist/index.html, servido tal cual a GPTBot/ClaudeBot/PerplexityBot -->
<span data-i18n="serv.corte.premium"></span>  <!-- vacío -->
<span data-i18n="serv.corte.premium.desc"></span>  <!-- vacío -->
<span>25,00 €</span> <span>45min</span>  <!-- precio sin nombre asociado -->
```

Verificado en producción con `curl -A "GPTBot" https://www.barberbarcelona.es/` → el mismo HTML vacío se sirve en vivo (mismo `etag`/`content-length` que con user-agent normal, sin bloqueo pero también sin texto).

El texto real ("Corte Premium", "45 min", descripciones) solo se inyecta con JavaScript client-side (`src/i18n/ui.ts` + script inline). **Investigación de Vercel + MERJ (2026) sobre >500M peticiones de GPTBot confirma que ningún crawler de IA mayor (GPTBot, ClaudeBot, PerplexityBot, Bytespider, Meta) ejecuta JavaScript** — solo leen el HTML crudo. Fuente: [SearchOptimo](https://searchoptimo.com/blog/do-ai-crawlers-render-javascript).

No hay tampoco ningún schema.org `Service`/`Offer`/`PriceSpecification` que compense esto a nivel de datos estructurados — se comprobó que `Services.astro` no contiene ningún bloque `ld+json`.

**Resultado:** ante una consulta tipo "cuánto cuesta un corte en Private Studio Barcelona" o "qué servicios ofrece", un motor de IA que solo lee HTML no tiene ningún texto ni dato estructurado del que extraer una respuesta — solo números sueltos sin etiqueta.

**Fix:** añadir el texto en español directamente en el markup de Astro (igual que ya se hace correctamente en Hero, Nosotros, Footer y Navbar — ver ejemplo abajo) y mantener `data-i18n` solo para el swap a inglés vía JS. Adicionalmente, añadir un bloque `ld+json` tipo `Service`/`Offer` por categoría con `priceCurrency: "EUR"`.

```astro
<!-- patrón correcto ya usado en Hero.astro / About.astro -->
<span data-i18n="hero.claim1">Un corte correcto puede cambiar tu presencia.</span>
```

---

### 🔴 CRÍTICO — Las 12 preguntas y respuestas del FAQ no existen como texto legible en el HTML

**Evidencia:** `src/components/FAQ.astro` construye el objeto `faqSchemaEs` con las 12 preguntas/respuestas completas y lo inyecta correctamente en un `<script type="application/ld+json">` (esto sí es texto plano en el HTML, no requiere JS). Pero el markup visible usa `<span data-i18n={faq.qKey}></span>` y `<p data-i18n={faq.aKey}></p>` **sin ningún texto de respaldo**, a diferencia del resto del sitio.

Confirmado en producción:
```
$ curl -s -A GPTBot https://www.barberbarcelona.es/ | grep -o 'data-i18n="faq.q1"[^>]*>[^<]*<'
data-i18n="faq.q1"><   ← vacío
```

**Matiz importante (hipótesis razonada, no verificada):** el texto SÍ está presente en los bytes del HTML porque vive dentro del `<script ld+json>`. El problema es que la mayoría de pipelines de extracción de contenido para RAG (tipo Readability/boilerplate-stripping, que es el patrón estándar para convertir HTML en "passages" citables) descartan el contenido de `<script>` antes de trocear el texto en pasajes. Esto significa que aunque el dato técnicamente esté en la página, es probable que **no se extraiga como pasaje citable en prosa** — solo como dato estructurado, si el pipeline del crawler parsea JSON-LD por separado (no lo hemos verificado para ningún crawler concreto).

Esto es doblemente relevante porque las preguntas del FAQ son casi un calco literal de las consultas objetivo reales ("¿Qué es el visagismo?", "¿Cómo puedo reservar?", "¿Hablan inglés?") — es el contenido con mayor potencial de citación directa de todo el sitio, y actualmente no es legible como prosa.

**Nota:** Google retiró los rich results de FAQPage para todos los sitios el 7 de mayo de 2026, así que este schema ya no aporta ningún beneficio de aparición en Google (ni rich snippet ni, previsiblemente, citación en AI Overviews vía ese mecanismo). El fix que se propone abajo no es "para recuperar rich results de Google" sino para que el texto exista como prosa legible independientemente del schema.

**Fix:** igual que el catálogo de servicios — texto en español embebido directamente en el JSX/markup, dejando `data-i18n` solo para el swap de idioma.

---

### 🟡 MEDIO — Ningún artículo del blog ni ninguna sección menciona precios en prosa

**Evidencia:** `grep -rn "€\|precio\|price" src/content/blog/*.md` → cero resultados en los 9 artículos del blog.

Combinado con el hallazgo anterior (precios solo en un widget JS-only), no existe en todo el sitio ningún pasaje de texto legible por un crawler no-JS que responda "cuánto cuesta". Es un hueco de citabilidad, no solo de UX.

**Fix:** no es necesario crear un artículo nuevo — basta con que el fix del hallazgo crítico #1 (texto estático en Services.astro) cubra esto. Opcionalmente, mencionar un rango de precio orientativo en la sección "Quiénes somos" o en el primer párrafo de algún artículo (p.ej. "que-es-visagismo-guia-completa") como refuerzo.

---

### 🟢 BAJO / POSITIVO — Accesibilidad de crawlers de IA: sin bloqueos detectados

**Evidencia:**
- `robots.txt` en producción: `User-agent: * / Allow: / / Sitemap: ...` — no bloquea ningún user-agent, incluidos GPTBot, ClaudeBot, PerplexityBot, Google-Extended, CCBot, Bytespider.
- `curl -A "GPTBot/1.0" https://www.barberbarcelona.es/`, `curl -A "ClaudeBot/1.0"`, `curl -A "PerplexityBot/1.0"` y `curl -A "Google-Extended"` → los cuatro devuelven `HTTP/2 200` con el mismo `etag` y `content-length` que una petición normal. No hay firewall de Vercel ni challenge page bloqueando estos user-agents.
- Sitio estático (`output: "static"` en `astro.config.mjs`) servido desde el edge de Vercel (`x-vercel-cache: HIT`) — no depende de hidratación para que el HTML base exista (el problema no es "SPA sin SSR", es contenido con fallback vacío dentro de un sitio que por lo demás sí es 100% estático).
- Sitemap.xml válido y accesible, con `lastmod` correctos.
- No existe `llms.txt` (404 verificado en vivo). **No lo recomiendo como prioridad**: no hay evidencia de que ningún motor de IA lo consuma de forma verificada a día de hoy, y Google Search lo ignora explícitamente. Si se quiere añadir igualmente como señal de buena fe / experimento de bajo coste, es razonable, pero no debe desplazar los dos fixes críticos de arriba.

---

### 🟡 MEDIO — hreflang apunta ambos idiomas a la misma URL

**Evidencia:** `src/layouts/Layout.astro:31-32`:
```astro
<link rel="alternate" hreflang="es" href={canonicalDomain + '/'} />
<link rel="alternate" hreflang="en" href={canonicalDomain + '/'} />
```
Ambas etiquetas apuntan a la raíz `/`, sin distinguir versión en inglés. El sitio sí tiene contenido bilingüe real (el toggle de idioma vía `data-i18n`, y el blog tiene posts ES/EN en URLs separadas: `/blog/que-es-visagismo-guia-completa/` vs `/blog/what-is-visagism-complete-guide/`), pero el hreflang no lo refleja ni siquiera para esas páginas.

Esto es principalmente un hallazgo de SEO técnico clásico (posible solape con el trabajo de `seo-technical`), pero también afecta GEO: un motor de IA que use señales de idioma para decidir qué versión citar en una respuesta en inglés vs español tiene una señal contradictoria o ausente.

**Fix:** si la home no tiene una URL `/en/` real, lo correcto es eliminar las etiquetas hreflang duplicadas (o usar `x-default`) en vez de declarar dos idiomas para la misma URL. Para los posts del blog, añadir hreflang cruzado entre las parejas ES/EN existentes.

---

## Señales de marca fuera del sitio (evidencia vía WebSearch, no vía API de ChatGPT/Perplexity)

**No se ha podido consultar ChatGPT ni Perplexity directamente** (sin API disponible) — lo que sigue es únicamente qué domina hoy el índice web que estas herramientas también consultan, vía `WebSearch`.

- Búsqueda `"Private Studio" barbería Barcelona Renato Rojas visagismo` → **el propio sitio (barberbarcelona.es) es el primer resultado**, con snippet correcto (fundación 2-feb-2024, Renato Rojas, visagismo). Positivo: no hay confusión de identidad en ese resultado.
- Búsqueda `mejor barbería Barcelona visagismo asesoría imagen` (la query objetivo casi literal) → **barberbarcelona.es aparece como primer resultado**, por delante de competidores directos (Wess Barber, Barbería Barcelona, Josep Pons) que también reclaman "visagismo"/"asesoría de imagen" en Barcelona.
- Otras apariciones confirmadas: Instagram (@private.studiobcn), Booksy (ficha "Private Studio" #90283), Páginas Amarillas (categoría "centro de estética masculina"), wanderboat.ai (directorio de negocios locales, listado como "Private Studio - La Mejor Barberia de Barcelona").
- **Aviso — no verificado:** el resultado de búsqueda también devolvió una ficha de Booksy separada, "Premium Barber Studio" (#158074), que podría ser un negocio distinto o una ficha duplicada/antigua de la misma barbería con otro nombre. No se ha confirmado cuál de las dos opciones es — recomendable que Alex/Renato lo revisen directamente en Booksy, no es algo que pueda resolver por búsqueda.
- **Hueco no cubierto (hipótesis, no evidencia de ausencia total):** no se ha encontrado ninguna listícula editorial de terceros tipo "las mejores barberías de Barcelona" que mencione a Private Studio (sí encontramos una de VIP Style Magazine, pero el snippet devuelto no incluye a Private Studio entre sus 5 elegidas — no se ha abierto la página completa para confirmarlo con certeza). Este tipo de contenido editorial de terceros es exactamente el tipo de fuente que Perplexity y AI Overviews suelen citar para preguntas de "mejor X en Y", más que la propia web de la marca. No afirmamos que Private Studio esté ausente de todas las listículas — solo que no hemos encontrado evidencia de presencia en ninguna, con el margen de búsqueda hecho.

**Fix (fuera del alcance de código):** conseguir menciones en medios/directorios editoriales terceros de Barcelona (prensa local, blogs de estilo masculino, guías de la ciudad) que nombren específicamente a Private Studio + visagismo. Esto no se arregla con cambios en el repo.

---

## Resumen para decisión rápida

Los dos fixes críticos (servicios y FAQ sin texto de respaldo) son cambios de código pequeños y de bajo riesgo — seguir exactamente el patrón ya usado en Hero/About/Footer (texto en español embebido + `data-i18n` para el swap a inglés) — y son, con diferencia, la palanca de mayor impacto para GEO: convierten el bloque de contenido más denso en hechos citables (precios, servicios, 12 respuestas a preguntas reales) de invisible a legible por cualquier crawler de IA, sin depender de que ejecuten JavaScript.
