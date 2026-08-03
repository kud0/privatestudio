# Backlinks & Citaciones Locales — barberbarcelona.es (2026-08-03)

## Declaración de Tier 0 (leer antes de lo demás)

Este análisis se hizo **solo con Common Crawl + crawler de verificación propio**. Confirmado con `claude-seo run backlinks_auth.py --check --json`:

```
tier: 0 — "Basic (Common Crawl + Verify only)"
moz:   unavailable — no MOZ_API_KEY configured
bing:  unavailable — no BING_WEBMASTER_API_KEY configured
dataforseo extension: not installed
```

**No hay acceso a Moz ni a Bing Webmaster Tools ni a la extensión DataForSEO en esta sesión.** Esto significa que este informe **NO puede dar**: Domain Authority (DA) / Page Authority (PA), Spam Score, recuento total de dominios referentes o backlinks a escala de industria, distribución de anchor text, ratio de enlaces tóxicos ni tendencia de link velocity. Nada de eso se inventa aquí. Si en algún momento se quiere esa capa, el camino es una API key gratuita de Moz (moz.com/products/api, 2.500 filas/mes) — desbloquearía DA/PA/spam score directamente para este dominio.

`whois` está instalado localmente, pero el registro `.es` (`whois.nic.es`) restringe las consultas por puerto 43 a cuentas con IP autorizada por Red.es — no es una limitación de esta sesión, es política del propio registro (ver hallazgo 4).

**Nota sobre `sent-link-requests.png`** (archivo en la raíz del repo): inspeccionado — es un screenshot de Google Ads (Sub-account settings → Sent link requests, vinculación de cuentas MCC de Google Ads), en estado vacío ("You don't have any entries yet"). **No tiene relación con link building ni backlinks.** Se descarta como pista para este informe.

---

## Evidencia base

- `claude-seo run backlinks_auth.py --check --json` — confirmación de tier/capacidades
- `claude-seo run commoncrawl_graph.py barberbarcelona.es --json`
- `claude-seo run verify_backlinks.py --target https://www.barberbarcelona.es --links <3 URLs candidatas: Booksy, Instagram, Facebook> --json`
- `claude-seo run validate_backlink_report.py --report <cc_data + verify_data> --json` → **PASS** (0 errores, 0 warnings, 1 info: no interpretar la ausencia en Common Crawl como "baja autoridad")
- `claude-seo run domain_history.py barberbarcelona.es --json`
- `whois barberbarcelona.es` (IANA) + `whois -h whois.nic.es barberbarcelona.es` (registro .es → *"The IP address used to perform the query is not authorised"*)
- Wayback Machine CDX API (`web.archive.org/cdx/search/cdx`), con sanity-check sobre `example.com` para confirmar que la API respondía antes de fiarse de un resultado vacío
- `src/layouts/Layout.astro` (líneas 57-109) — leído en su totalidad para el NAP y el `sameAs` ya declarados en el schema
- `curl` directo (con y sin User-Agent de navegador, `--max-time`, `-L`) contra 20+ URLs de directorios/citaciones/listículas candidatas, una por una
- `claude-seo run fetch_page.py` contra sitios con bloqueo sospechoso, con y sin `--googlebot`
- `grep`/parsing sobre el HTML en vivo de `barcelona.place/barberia-eixample/` y `barbershopmap.com/barberias/barcelona` para confirmar (no asumir) si Private Studio aparece mencionado, y sobre el `wp-json` público de barcelona.place para localizar la URL real del formulario de alta

---

## Findings

### 1. [INFO — no es un defecto] 0 dominios referentes detectados en Common Crawl
**Evidencia:**
```json
{"domain": "barberbarcelona.es", "in_crawl": false, "in_rankings": false, "pagerank": null,
 "note": "Domain not found in Common Crawl data. It may be too new, too small, or not yet crawled."}
```
**Interpretación correcta (validada por `validate_backlink_report.py`):** esto **no** significa "autoridad baja" ni "perfil de enlaces malo" — Common Crawl es una muestra trimestral que sub-representa sitios jóvenes, pequeños y geo-específicos. Es esperable para un dominio de ~2 años (abierto 2024-02-02) de un negocio local de un solo local. Es un dato legítimo de partida, no un fallo del análisis ni del sitio.
**Fix:** ninguno aplicable a código. La vía real para ganar visibilidad de un negocio así no es link building clásico, sino citaciones locales (ver hallazgo 5 y la lista priorizada).

### 2. [INFO] Historial del dominio: whois bloqueado, pero Wayback Machine no muestra huella previa
**Evidencia:** `domain_history.py` no pudo obtener el whois `.es` (Red.es restringe el puerto 43 a cuentas con IP autorizada; `whois -h whois.nic.es barberbarcelona.es` lo confirmó directamente: *"The IP address used to perform the query is not authorised"*). Como contraste, la Wayback Machine CDX API (`web.archive.org/cdx/search/cdx?url=barberbarcelona.es&matchType=domain`) devolvió **cero snapshots** (`[]`, HTTP 200 — se confirmó que la propia API funcionaba pidiendo snapshots reales de `example.com` en la misma sesión, para no confundir "vacío por fallo de red" con "vacío real").

**Interpretación honesta:** un historial de Wayback vacío no es prueba absoluta de que el dominio nunca se usara antes (Wayback no lo rastrea todo), pero sí es una ausencia genuina de evidencia de parking, spam o un negocio anterior no relacionado — justo lo que se querría ver para un dominio cuyo negocio real abrió el 2024-02-02. No se encontró ninguna señal de riesgo de "expired domain heritage" ni cambio de temática.
**Fix:** ninguno accionable. Si en algún momento hiciera falta una respuesta 100% autoritativa (p. ej. antes de una cuestión legal/de compra de dominio), el whois `.es` completo se puede pedir vía el formulario web `sede.red.gob.es/sede/whois` o un panel de registrador — no disponible para este crawler en este tier.

### 3. [BAJA] Solo uno de tres enlaces de perfil conocidos se pudo verificar en positivo — un resultado del crawler es un falso negativo, corregido aquí
**Evidencia:** `verify_backlinks.py` contra las 3 URLs de perfil que plausiblemente enlazan de vuelta al sitio (no había candidatos de Common Crawl que probar, porque CC no devolvió ninguno):

| Fuente | Resultado | Detalle |
|---|---|---|
| Booksy (`booksy.com/es-es/90283_private-studio_barberia_48863_barcelona`) | **Verificado — vivo** | HTTP 200, enlace a `barberbarcelona.es` confirmado presente, `rel="nofollow noopener"` |
| Instagram (`instagram.com/private.studiobcn/`) | No verificable | El bio-link de Instagram se renderiza con JS del lado cliente; el crawler lo reportó correctamente como `unverifiable_js` en lugar de adivinar |
| Facebook (`facebook.com/profile.php?id=61574816260980`) | El crawler lo etiquetó "link_removed" — **es un falso negativo, no un hallazgo real** | HTTP 400 en el GET. Verificación manual adicional: una petición `HEAD` sí redirige con 301 a una página canónica viva (`facebook.com/people/Private-Studio-Barberia-Bcn/61574816260980/`), y Facebook devuelve HTTP 400 a *cualquier* GET no autenticado de una página de perfil, con o sin UA de navegador — es el muro de login/anti-scraping de Facebook, no evidencia de que el enlace al sitio haya desaparecido del perfil. |

**Fix:** solo corregir la interpretación — no accionar la etiqueta "link_removed" de Facebook como si fuera un hallazgo real. Confirmación positiva del enlace de Facebook/Instagram requeriría una comprobación manual con sesión iniciada (no automatizable en Tier 0). El enlace de Booksy es real, está vivo y su `nofollow` es lo normal para un listado de marketplace — no es un problema; una citación nofollow sigue aportando valor de NAP/SEO local aunque no transmita PageRank. Cruza con `local.md` #3 (añadir Booksy al `sameAs` del schema, aún pendiente).

### 4. [ALTA] Ausente en las dos listículas editoriales que de verdad compiten por el SERP de "mejor barbería Eixample" — con vía de alta verificada
**Contexto:** `sxo.md` ya había identificado que el SERP de queries de barrio ("mejor barbería Eixample") está dominado por listículas de terceros, citando genéricamente `barcelona.place` y `barbershopmap.com`. Este informe verifica en vivo **las URLs exactas** y confirma la ausencia:

- `https://barcelona.place/barberia-eixample/` → HTTP 200. Título real: **"Las 12 mejores barberías del Eixample de Barcelona"** (localizado vía su API pública `wp-json/wp/v2/posts?search=...`, no adivinado). Búsqueda sobre el HTML completo de la página de "private studio" / "muntaner 172" / "barberbarcelona" → **0 coincidencias**. Private Studio no está en esta lista.
- `https://barbershopmap.com/barberias/barcelona` → HTTP 200. Misma búsqueda sobre el HTML → **0 coincidencias**. Tampoco está aquí.

**Vía de alta confirmada:** `barcelona.place/join/` → **HTTP 200**, extraído del `href` real detrás del botón "Publicar mi empresa" en la propia página de la listícula (leído del HTML, no inventado).

Para `barbershopmap.com` **no se encontró** un enlace de alta/reclamo visible en la home ni en la página de categoría de Barcelona — haría falta contacto manual (sección "About"/contacto del sitio).

**Impacto:** de las dos, `barcelona.place` es la de acción más clara y menor fricción (formulario de alta ya localizado y verificado en vivo). Es exactamente el tipo de citación que mueve la aguja: entra en el SERP donde Google —y por extensión los AI Overviews/Perplexity, que citan agregadores y listículas con frecuencia para queries locales— ya está mostrando resultados para "mejor barbería Eixample".
**Fix (dueño):** rellenar el formulario en `barcelona.place/join/` con NAP exacto (**Private Studio · Carrer de Muntaner, 172, Bajo 01, 08036 Barcelona · +34 624 367 153** — tomado directamente de `Layout.astro`). Para `barbershopmap.com`, contactar manualmente vía su sección de contacto (no verificada aquí — no se encontró un formulario de alta automático).

---

## Directorios comprobados que NO se recomienda priorizar (con evidencia)

Comprobado uno por uno con `curl`/`fetch_page.py` para no repetir ni contradecir lo que ya cerró `local.md` (que ya cubre Páginas Amarillas, Yelp, Tripadvisor, Cylex, Hotfrog, QDQ, Trustpilot como ausentes/de bajo tráfico para este negocio — no se duplica aquí):

| URL | Resultado | Nota |
|---|---|---|
| `11870.com` | HTTP 403 (Cloudflare, incl. con `--googlebot`) | No verificable ni con navegador ni con Googlebot UA — bajo tráfico real en Barcelona según `local.md`, no priorizar |
| `cylex.es` | HTTP 403 (Cloudflare) | Igual que arriba |
| `cambrabcn.org` (Cambra de Comerç de Barcelona) | HTTP 200, pero sin sección de directorio de empresas — solo noticias/formación/censo electoral de socios | No es un directorio de citaciones para el público, descartar |
| `ajuntament.barcelona.cat/comerc/es` | HTTP 200, pero su "directorio de comercio" cubre centros comerciales/mercados municipales, no negocios individuales | Bajo encaje, descartar |
| `guia.barcelona.cat` | HTTP 200, pero su directorio es de entidades/asociaciones/equipamientos públicos, sin categoría de barbería/peluquería/belleza ni vía de alta para un negocio privado | Bajo encaje, descartar |
| `barcelonacomerc.cat` | HTTP 000 (no resuelve/timeout) | No accesible, descartar |
| `eixample.cat` | HTTP 000 (no resuelve/timeout) | No accesible, descartar |

**No verificado en esta sesión (no tratar como confirmado):** si Private Studio ya tiene o no ficha en Yelp, Treatwell, QDQ o Páginas Amarillas más allá de lo que `local.md` ya cerró — sus buscadores internos renderizan resultados vía JS/API, un `curl` plano no lo confirma ni lo descarta. Estado real del Google Business Profile (claim/optimización) — Google Maps bloquea comprobación automatizada fiable sin sesión, verificar a mano en GBP Manager.

---

## Lista priorizada — de dónde conseguir las primeras citaciones/enlaces reales

Solo URLs verificadas con `curl` en esta sesión (o ya verificadas y cerradas en `local.md`, referenciadas para no duplicar trabajo del dueño).

1. **`barcelona.place/join/`** (HTTP 200, verificado) — para entrar en `barcelona.place/barberia-eixample/`, la listícula "Las 12 mejores barberías del Eixample de Barcelona" donde Private Studio está confirmado ausente. Máxima prioridad: es la acción de menor fricción con mayor encaje temático detectado en este audit.
2. **`barbershopmap.com`** (categoría `barbershopmap.com/barberias/barcelona`, HTTP 200, verificado ausente) — contactar manualmente para alta/reclamo, ya que no se encontró formulario de alta automático.
3. **Páginas Amarillas** — ya priorizado en `local.md` #6 (competidores directos de la misma calle sí están listados, Private Studio confirmado ausente). No repetir aquí, solo referenciar: es la citación nacional de mayor autoridad y gratuita.
4. **Fresha** — arreglar la ficha rota existente (`local.md` #5) antes que crear citaciones nuevas: ahora mismo hay una ficha con 404 y nombre inconsistente ("BARBERÍA | PRIVATE STUDIO | MANICURA RUSA") indexada por Google, lo cual es peor que no tener ficha.
5. **Booksy** — ya presente y verificado en vivo (hallazgo 3). Única acción pendiente: añadirlo al `sameAs` del schema (`local.md` #3), no una citación nueva.
6. **`timeout.com/barcelona`** (Time Out Barcelona, HTTP 200 verificado) — medio de prensa/listícula de alta autoridad en inglés con base en Barcelona; encaja con el ángulo "expat barber Barcelona" ya presente como keyword objetivo en `seo-research.md`. Acción: outreach editorial directo (pedir inclusión en sus guías de barberías/grooming de Barcelona) — no se verificó un mecanismo de autopublicación, es contacto editorial, no alta automática.
7. **`barcelona-metropolitan.com`** (HTTP 200 verificado) — revista en inglés dirigida a la comunidad expat de Barcelona; no es un directorio autoservicio, sino un medio editorial real que publica rankings tipo "best of Barcelona" de servicios/grooming. Mismo ángulo que el punto 6, relevante para el segmento angloparlante que la web ya targetea (versión EN + posicionamiento premium/visagismo).
8. **Instagram (`@private.studiobcn`)** — no accionable vía backlinks/citaciones (el enlace en bio no se puede verificar por HTTP porque Instagram renderiza el perfil con JavaScript — clasificado `unverifiable_js`, no un error). Acción manual: confirmar a mano que el link en bio apunta a `barberbarcelona.es` y no a una URL antigua.

**No priorizar:** 11870.com y Cylex.es (bloqueados por Cloudflare, tráfico bajo confirmado en `local.md`); Cambra de Comerç, Ajuntament de Barcelona (`/comerc`) y `guia.barcelona.cat` (verificados en vivo, pero sin sección de directorio aplicable a un negocio individual como una barbería); `barcelonacomerc.cat` y `eixample.cat` (no resuelven).

**Cero esquemas manipulativos considerados o recomendados** — todo lo anterior son citaciones y menciones editoriales legítimas, verificadas en vivo una por una.

---

## No verificado / fuera de alcance

- DA/PA, Spam Score, recuento de dominios referentes, distribución de anchor text, ratio de enlaces tóxicos, link velocity, ratio follow/nofollow a escala — todo requiere Moz/Bing/DataForSEO, ninguno configurado en esta sesión (ver declaración de Tier 0 arriba).
- Si Private Studio ya tiene o no ficha en Yelp/Treatwell/QDQ/Páginas Amarillas más allá de lo ya cerrado en `local.md` — sus interfaces de búsqueda renderizadas por JS bloquearon la confirmación automatizada en ambos sentidos.
- Estado de claim/optimización del Google Business Profile.
- Fecha de registro/registrador del whois `.es` (bloqueado por la política de IP-allowlist de Red.es en el puerto 43).
