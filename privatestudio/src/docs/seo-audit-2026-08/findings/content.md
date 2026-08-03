# Content Quality & E-E-A-T — barberbarcelona.es

**Fecha:** 2026-08-03
**Alcance:** 9 posts de blog (5 ES / 4 EN), home ES/EN, FAQ, autoría, señales de experiencia.
**Score de Content Quality: 60/100** — base sólida (autor+fecha reales, reseñas y FAQ con especificidad real, vídeo propio del fundador) lastrada por posts cortos sin foto/vídeo en el 78% del blog, cero página/entidad de autor, y un sistema ES/EN que solo cambia el texto visible sin tocar URL/canonical/schema.

> Nota sobre metodología: `content_quality.py` (claude-seo) devolvió 94-96/100 en las 11 URLs. Ese número **no es fiable como score de calidad de contenido real**: analiza el HTML completo (nav, footer, JSON-LD, y el JSON bilingüe embebido — ver hallazgo #8), no el cuerpo del artículo, así que mide "ausencia de filler/repetición a nivel de página", no profundidad ni E-E-A-T. El recuento de palabras usado abajo es manual, sobre el `.md` de cada post (frontmatter excluido) y contrastado con `parse_html.py` sobre el HTML en vivo — ambos coinciden.

---

## Recuento de palabras real por post (cuerpo, sin frontmatter)

| Post | Idioma | Palabras (md) | Palabras (parse_html en vivo) |
|---|---|---|---|
| `mens-grooming-guide-barcelona.md` | EN | 806 | 827 |
| `fade-vs-taper-vs-degradado-diferencia.md` | ES | 792 | 779 |
| `como-cuidar-barba-en-casa.md` | ES | 709 | 699 |
| `fade-vs-taper-difference-explained.md` | EN | 688 | 694 |
| `how-to-care-for-your-beard-at-home.md` | EN | 643 | 645 |
| `que-es-visagismo-guia-completa.md` | ES | 458 | 479 |
| `tendencias-corte-pelo-hombre-2026.md` | ES | 439 | 461 |
| `mens-haircut-trends-2026.md` | EN | 425 | 456 |
| `what-is-visagism-complete-guide.md` | EN | 415 | 442 |

5 de 9 posts están por debajo de 500 palabras. Son cortos, no "thin" en el sentido de vacíos (todos tienen estructura H2/H3 real, pasos numerados, sin relleno detectado por la herramienta), pero sí insuficientes para el ángulo "guía completa" que prometen sus propios títulos ("Guía Completa", "Complete Guide") frente a competidores que atacan las mismas keywords (visagismo, fade vs taper) con más profundidad.

**Fix:** Ampliar los 4 posts <500 palabras (`que-es-visagismo-guia-completa`, `what-is-visagism-complete-guide`, `tendencias-corte-pelo-hombre-2026`, `mens-haircut-trends-2026`) a 800-1200 palabras, priorizando los dos de visagismo (son la pieza pilar del posicionamiento de marca). Añadir sección práctica ("cómo saber tu forma de rostro en casa", pasos concretos) en vez de solo teoría.

---

## Hallazgos

### [ALTO] 7 de 9 posts (78%) no tienen ninguna imagen, vídeo o embed — cero prueba visual de experiencia
**Evidencia:** `grep instagram: src/content/blog/*.md` solo da positivo en 2 ficheros (`que-es-visagismo-guia-completa.md`, `what-is-visagism-complete-guide.md`). El schema de contenido (`src/content/config.ts`) define un campo `image` opcional, pero `grep "image:" src/content/blog/*.md` no da ningún resultado — ningún post lo usa. `grep "!\["` (sintaxis de imagen Markdown) tampoco da resultados en ningún post.
**Por qué importa:** la "E" de Experience en E-E-A-T es precisamente esto — mostrar que quien escribe realmente ha hecho el trabajo (fotos del proceso, antes/después, el producto real). Un blog de barbería especializada en visagismo que explica "cómo identificar tu forma de rostro" sin una sola foto de referencia facial es la definición de contenido sin evidencia de primera mano, por bien escrito que esté el texto.
**Fix:** El propio `informe-seo-owner.md` (líneas 52-66) ya identifica esto y pide a Alex fotos/reels para 5 de los 9 posts — sigue pendiente. Mínimo viable inmediato y gratis: reutilizar los vídeos ya existentes en `public/images/` (`renato-dinamico-web.mp4`, `reni_about_1.mp4`) o capturas de ellos como imagen de portada (`image:` en frontmatter) en los 7 posts sin foto, mientras se consigue contenido dedicado por post.

### [ALTO] No existe página o entidad de autor — solo un nombre suelto
**Evidencia:** `find src/pages` solo devuelve `blog/[...slug].astro`, `blog/index.astro`, `index.astro`, `review.astro` — no hay `/autor`, `/renato-rojas` ni `/equipo`. El único schema `Person` para Renato es `{"@type": "Person", "name": "Renato Rojas"}` en dos sitios (`src/layouts/Layout.astro:101` como `founder` del `BarberShop`, y `src/pages/blog/[...slug].astro:24` como `author` del `Article`) — en ningún caso lleva `url`, `image`, `sameAs`, `jobTitle` o `description`.
**Por qué importa:** Google y los motores de IA no pueden verificar credenciales de un `Person` que es solo una cadena de texto. La bio real de Renato existe (About.astro: "barbero peruano con más de una década de experiencia", fundador 2024-02-02) pero vive solo en la home, no está enlazada desde los posts ni marcada como entidad de autor reutilizable.
**Fix:** Añadir `"url"`, `"image"` (usar `/images/logo_new.png` o una foto real de Renato) y `"jobTitle": "Barbero, Fundador"` al `Person` en ambos schemas. A medio plazo, crear una página `/renato-rojas` o `/sobre-nosotros` con la bio completa y enlazarla desde cada post (`author.url`) — 15 min de trabajo con el copy que ya existe en `About.astro`.

### [ALTO] El blog lleva ~4.5 meses parado pese a un plan de cadencia ya escrito
**Evidencia:** `git log --diff-filter=A -- src/content/blog/*.md` muestra que los 9 posts se añadieron en un único commit el 2026-03-19 (posterior a la fecha del informe, 17-feb-2026). Hoy es 2026-08-03. Cero commits nuevos en `src/content/blog/` desde entonces. `informe-seo-owner.md` (línea 47) pide "2-3 artículos al mes" y `seo-research.md` (líneas 74-91) ya tiene 16 títulos de próximos posts investigados y listos para escribir.
**Por qué importa:** frescura de contenido es señal de autoridad temática tanto para Google como para AI Overviews/ChatGPT (que priorizan fuentes actualizadas). Un blog "publicado" en un solo día y luego abandonado se lee como una acción puntual de SEO, no como un negocio activo publicando expertise continua.
**Fix:** decisión de negocio, no de código — retomar el calendario (aunque sea 1 post/mes) usando los 16 temas ya investigados en `seo-research.md`.

### [MEDIO] El "home en inglés" no existe para rastreadores — es solo un cambio de texto en el cliente
**Evidencia:** `src/components/LanguageProvider.astro` cambia `el.innerHTML` por JS tras `DOMContentLoaded`, leyendo `localStorage.getItem('lang')`. El HTML servido (`fetch_page.py` sin JS, y confirmado con `parse_html.py`: `home.html` word_count=1060, íntegramente en español) es 100% español siempre por defecto. No hay URL propia para el inglés (no `/en/`), y `src/layouts/Layout.astro:14` calcula el canonical como `canonicalDomain + Astro.url.pathname` — es decir, aunque alguien enlazara `/?lang=en`, el canonical seguiría apuntando a `/` (español), diciéndole a Google que ignore esa variante.
**Por qué importa:** el propio `seo-research.md` (sección 4.2/5.1) marca "expat/English market" como oportunidad de diferenciación poco explotada por la competencia. Pero tal como está construido, Google (y cualquier rastreador de IA que haga fetch simple sin sesión/localStorage) nunca ve una home en inglés — no hay contenido en inglés indexable en la página más importante del sitio.
**Fix (cross-referencia con auditoría técnica):** o (a) mover el inglés a una URL real `/en/` prerenderizada por Astro con su propio HTML servido en inglés, o (b) si se mantiene el toggle client-side, aceptar que el inglés es solo cosmético para visitantes humanos y no una estrategia SEO — no prometer "contenido en inglés indexable" en ningún informe futuro.

### [MEDIO] hreflang y schema de FAQ ignoran el idioma real de la página — mismo origen que el hallazgo anterior
**Evidencia:**
- `src/layouts/Layout.astro:31-32` — el bloque hreflang está hardcodeado a `canonicalDomain + '/'` para `es` y `en` **en todas las páginas**, incluidos los posts de blog. Resultado verificado: una página de blog en inglés (p.ej. `what-is-visagism-complete-guide`) declara como su alternate "es"/"en" la home — no su propio par ES, y los 4 pares ES/EN de posts no tienen ningún hreflang entre sí.
- `src/components/FAQ.astro:17-34,72` — el JSON-LD `FAQPage` (`faqSchemaEs`) solo existe en español y se sirve siempre igual, aunque el visitante tenga el toggle en inglés y esté viendo las preguntas traducidas en pantalla. No existe una variante `faqSchemaEn`.
**Por qué importa:** en ambos casos el dato estructurado que lee Google no corresponde con lo que ve el usuario/rastreador en esa página. Es sintomático de que el sistema de idioma (`data-i18n`) nunca toca nada fuera del `innerHTML` visible.
**Fix:** pasar `lang` de cada página al `Layout` y generar el hreflang real por página (ES↔EN del mismo post o de la home); condicionar `faqSchemaEs`/añadir `faqSchemaEn` según `post.data.lang` o el idioma de la página.

### [MEDIO] Sección de "trabajo real" (Gallery) construida pero nunca publicada, y con imágenes inexistentes
**Evidencia:** `src/components/Gallery.astro` referencia `gallery-1.jpg` … `gallery-6.jpg` con alt-text cuidado ("Proceso de corte de cabello con técnica de visagismo", etc.) — evidencia de que alguien planeó una sección de portfolio. Pero `src/pages/index.astro` importa `Gallery` (línea 5) y **no la renderiza** (no aparece `<Gallery />` en el JSX, línea 14-24). Confirmado además que ni siquiera podría funcionar si se activara: las 6 imágenes devuelven 404 en producción (`curl -I https://www.barberbarcelona.es/images/gallery-1.jpg` → 404, verificado en las 6).
**Por qué importa:** es la segunda fuente independiente (junto con el hallazgo del blog) de por qué el sitio carece de evidencia visual de trabajo real — había una sección pensada para esto y quedó huérfana.
**Fix:** o completar la sección (subir 6 fotos reales de cortes/barba a `public/images/gallery-*.jpg` y añadir `<Gallery />` al home) o eliminar el import muerto en `index.astro` si se decide no usarla.

### [BAJO] Titulares del hero usan `<br>` entre palabras sin espacio — riesgo de extracción de texto para IA
**Evidencia:** `src/i18n/ui.ts:18-20` — `'hero.h1.1': '¿Y SI EL PROBLEMA<br>NO ES TU PELO…<br>SINO TU<br><span>TIPO DE ROSTRO?</span>'`. Verificado en el HTML servido en producción: el H1 se sirve exactamente así. Cualquier extractor de texto que no trate `<br>` como espacio en blanco concatena "PROBLEMA"+"NO" → "PROBLEMANO", "TU"+"TIPO" → "TUTIPO".
**Por qué importa:** es el titular más importante de la home. Los navegadores y Googlebot normal lo renderizan bien; el riesgo es específico a pipelines de extracción de texto plano (algunos crawlers de IA / lectores simplificados) que no siempre insertan espacio en un `<br>`. Impacto real no verificable sin acceso a logs de esos crawlers — se marca como riesgo, no como bug confirmado en buscadores.
**Fix:** cambiar a `<br> ` (con espacio) o usar saltos de línea vía CSS (`white-space: pre-line` con `\n` en el string) en vez de `<br>` pegado a la palabra siguiente.

### [BAJO / informativo] El JSON de traducciones completo (ES+EN) se incrusta en cada página, contaminando el análisis de contenido
**Evidencia:** `src/components/LanguageProvider.astro:5-6` — `window.translations = ui` vuelca el objeto entero de `src/i18n/ui.ts` (395 líneas, ambos idiomas) como JSON dentro de un `<script>` en cada página. Esto explica por qué `content_quality.py` marcó frases como "elevate your" / "transform your" en páginas 100% en español (`blog_.html`, todos los `blog_*.md` en ES): esas frases están en el bloque JSON en inglés incrustado, no en el copy visible.
**Por qué importa:** impacto en ranking probablemente nulo (los indexadores clásicos no leen el contenido de `<script>` como texto de página), pero es ruido para cualquier auditoría de contenido automatizada y peso extra en cada carga de página.
**Fix:** no crítico para SEO; nota para el auditor técnico/performance, no acción prioritaria de contenido.

---

## Lo que SÍ funciona (evidencia, no elogio genérico)

- **Autoría real y consistente:** los 9 posts tienen `author: "Renato Rojas"` + `date` real en frontmatter, mostrados en pantalla (nombre + fecha + tiempo de lectura) y en el schema `Article`. Es la base correcta — solo le falta profundidad de entidad (ver hallazgo de autor arriba).
- **Vídeo propio del fundador, no stock:** `renato-dinamico-web.mp4` (hero) y `reni_about_1.mp4` (About, alt="Renato Rojas trabajando en Private Studio Barcelona") son grabaciones reales del barbero trabajando — señal de experiencia de primera mano genuina en la home, aunque no se traslade al blog.
- **Reseñas con especificidad real:** `src/components/Reviews.astro` usa nombres completos, fechas relativas variadas ("hace un año", "hace 8 meses", "hace una semana") y hasta menciona a un segundo barbero real ("Pablo"), coherente con el sistema de "embajadores Private Studio" descrito en `About.astro`. Verosímil como reseñas reales de Google — no verificado contra el GBP en vivo por falta de credenciales API.
- **FAQ con contenido específico, no genérico:** las 12 preguntas (`FAQ.astro`) incluyen precios de packs con nombre ("Pack Cortes", "Mix Express", "Pack Presidencial"), horario exacto, dirección exacta y explicaciones técnicas reales (fade/taper/skin fade) — no son respuestas de relleno.
- **Pares ES/EN del blog son traducciones reales con paridad estructural, no contenido girado/duplicado:** verificado encabezado por encabezado en los 4 pares (visagismo, barba, fade/taper, tendencias) — mismo número y orden de H2/H3 en ambos idiomas, con recuentos de palabras que difieren de forma natural (5-15%, típico de traducción real, no de copia literal ni de spinning).
