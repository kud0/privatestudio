# Local SEO Audit — Private Studio (barberbarcelona.es)
Fecha: 2026-08-03. Negocio: brick-and-mortar puro, 1 local, 1 barbero principal, Eixample Barcelona.

**Score Local SEO: 60/100**

Metodología: verificación pública (WebFetch/curl/WebSearch/geocoding gratuito). Sin acceso a Google Business Profile API ni DataForSEO. Cada hallazgo indica su fuente y nivel de confianza. Lo que no pude verificar de forma independiente se marca explícitamente.

---

## CRÍTICO — corregible en código

### 1. `@type: "BarberShop"` no existe en schema.org
**Archivo:** `src/layouts/Layout.astro:61`
**Evidencia:** `https://schema.org/BarberShop` → HTTP 404 (no existe como tipo). El tipo válido más cercano y ampliamente soportado es `HairSalon` (`https://schema.org/HairSalon` → 200, jerarquía `Thing > Organization/Place > LocalBusiness > HealthAndBeautyBusiness > HairSalon`).
**Impacto:** un `@type` inválido puede ser ignorado o degradado a un tipo genérico por los validadores de Google, debilitando exactamente la señal de negocio local que más importa para el map pack.
**Fix:** cambiar `"@type": "BarberShop"` → `"@type": "HairSalon"` en el JSON-LD de `Layout.astro`.

### 2. Coordenadas GPS del schema desviadas ~70-75m de la dirección real
**Archivo:** `src/layouts/Layout.astro:76-79` (`latitude: 41.3925, longitude: 2.1530`)
**Evidencia:**
- Geocoding libre (Nominatim/OSM) para "Carrer de Muntaner 172, Barcelona" → `41.3919, 2.1527`.
- Coordenadas reales del propio pin de Google Maps del negocio (resueltas desde el enlace corto oficial `maps.app.goo.gl/g1CY1yPGPptzhyWx7` → Place ID `0x12a4a3007fb63849:0xdb8f4c231b0c92b3`) → `41.3918882, 2.152643`.
- Ambas fuentes independientes coinciden entre sí (~10m de diferencia) y difieren del schema declarado en ~70-75m (Δlat 0.0006°≈68m, Δlon 0.0004°≈30m).
**Impacto:** una desviación de 70m en una manzana densa del Eixample puede apuntar al edificio o acera equivocada — señal de precisión de ubicación que Google usa para el ranking de proximidad en el map pack.
**Fix:** actualizar `geo.latitude`/`geo.longitude` a `41.3919`, `2.1527` (o las coordenadas exactas que el propio dueño confirme desde el panel de GBP).

### 3. `sameAs` del schema no incluye Booksy
**Archivo:** `src/layouts/Layout.astro:96-99`
**Evidencia:** Booksy (`https://booksy.com/es-es/90283_private-studio_barberia_48863_barcelona`) confirmado en vivo, NAP idéntico al del sitio, **4.9★ con 206 reseñas** — el volumen de reseñas de terceros más alto verificado para este negocio.
**Fix:** añadir la URL de Booksy al array `sameAs`.

---

## ALTO — el dueño tiene que actuarlo a mano (GBP / citaciones / reseñas)

### 4. El nombre del Google Business Profile NO es "Private Studio"
**Evidencia:** al resolver el enlace oficial `maps.app.goo.gl/g1CY1yPGPptzhyWx7` (el mismo que usa la web y el footer), Google redirige a:
`.../maps/place/Private+Studio+-+La+Mejor+Barberia+de+Barcelona/...`
Confirmado por segunda fuente independiente (agregador wanderboat.ai indexa el mismo título: *"Private Studio - La Mejor Barberia de Barcelona"*).
**Impacto doble:**
- Inconsistencia de NAP: la web, el schema y el footer dicen "Private Studio"; el propio GBP dice "Private Studio - La Mejor Barberia de Barcelona".
- Viola las [normas de Google para el nombre de perfil](https://support.google.com/business/answer/7255319) (no se permite añadir eslóganes/keywords al nombre real del negocio). Es un motivo común de suspensión o de pérdida de visibilidad en el map pack.
**Fix (dueño, en GBP):** cambiar el nombre del perfil a exactamente "Private Studio", sin el sufijo.

### 5. Citación en Fresha rota y con nombre/servicio inconsistente
**Evidencia:** la URL indexada por Google (`fresha.com/lvp/barberia-private-studio-manicura-rusa-carrer-de-muntaner-barcelona-6NBX4B`) devuelve **HTTP 404** al acceder directamente (verificado con curl, dos veces). El snippet indexado (que Google todavía muestra en resultados de búsqueda) tiene como nombre **"BARBERÍA | PRIVATE STUDIO | MANICURA RUSA"** — mezcla el nombre del negocio con un servicio ("manicura rusa") que no aparece en ningún sitio de la web actual.
**Impacto:** una citación que aparece en Google pero da 404 al hacer clic (mala experiencia + señal de negocio inconsistente/potencialmente cerrado), y un nombre que no coincide con la marca real.
**Fix (dueño):** entrar a Fresha, reclamar/corregir el listing (nombre exacto "Private Studio", quitar "manicura rusa" si no es un servicio propio) o darlo de baja si es un perfil heredado de otro negocio/inquilino previo del local.

### 6. Ausente en Páginas Amarillas (directorio español de referencia)
**Evidencia:** búsquedas dirigidas (`site:paginasamarillas.es "Private Studio"` y variantes con Yelp/Tripadvisor/Cylex/Hotfrog/QDQ/Trustpilot) no devuelven ningún listing de Private Studio. En cambio, competidores directos en la misma calle SÍ están listados: Barbieri Abbate (Muntaner 113), Barcelona Barber Shop (Muntaner 176), Rufianes Barberia i Tattoo (Comte d'Urgell 42). No se encontró presencia en Yelp, Tripadvisor, Cylex, Hotfrog, QDQ ni Trustpilot tampoco.
**Fix (dueño):** dar de alta el negocio en Páginas Amarillas (gratuito, es el directorio nacional con más autoridad en España). El resto (Yelp/Tripadvisor/Cylex/Hotfrog/QDQ) tiene bajo tráfico real en Barcelona para este nicho — no priorizar tiempo ahí.

### 7. Horario de sábado: posible discrepancia (corroborada 2 veces, no verificada en directo)
**Evidencia:** la web dice sábados 11:00-19:00 (footer, schema, FAQ). Dos snippets indexados independientes (Fresha y wanderboat.ai) muestran sábado **10:00-16:00**. No pude verificar el contenido en vivo de ninguna de las dos páginas (Fresha da 404 directo; wanderboat bloquea con Cloudflare), así que esto **no está confirmado al 100%**, pero dos fuentes distintas coinciden en el mismo dato discrepante.
**Fix (dueño):** revisar manualmente el horario de sábado en GBP y en Fresha (ligado al hallazgo #5) y corregir si está desactualizado.

### 8. Facebook Page sin actividad de reseñas
**Evidencia:** el snippet indexado de la página de Facebook (`facebook.com/p/Private-Studio-Barberia-Bcn-61574816260980/`) muestra **"Not yet rated (0 Reviews)"**. No pude confirmar esto con una lectura directa del HTML (Facebook sirve un shell JS a fetchers no autenticados), así que es de confianza media, basada en índice de búsqueda, no en verificación directa.
**Fix (dueño):** si el dueño no usa Facebook activamente para reseñas, no es prioritario arreglarlo — pero si va a pedir reseñas, concentrar el esfuerzo en Google (impacta el map pack) y no repartirlo entre Facebook.

### 9. Reseñas repartidas entre plataformas — Google debe ser la prioridad
**Evidencia:** Booksy confirmado con 4.9★/206 reseñas (verificado en vivo). Google Business Profile: 5.0★ (dato aportado en el contexto compartido, no verificable de forma independiente por mi parte — Google Maps bloquea el fetch sin sesión). No hay forma de saber cuántas reseñas tiene el GBP real desde fuera.
**Fix (dueño):** las reseñas de Booksy no cuentan para el ranking del map pack de Google. El flujo de pedir reseñas (ya existe `/review` en la web, que apunta directo al formulario de Google) es la práctica correcta — mantenerlo y priorizar SIEMPRE la reseña en Google sobre Booksy/Facebook cuando se le pide al cliente.

---

## Lo que SÍ está bien (verificado)

- NAP interno consistente: nombre, teléfono (+34 624 367 153) y dirección coinciden en Footer, Navbar, FAQ (schema y i18n), y el JSON-LD de `Layout.astro`.
- El dominio antiguo `privatestudio.vercel.app` redirige con 308 permanente a `www.barberbarcelona.es` — sin riesgo de contenido duplicado.
- Instagram (`@private.studiobcn`) verificado en vivo: 794 seguidores, 131 posts, handle y nombre coherentes con la marca.
- No se detectaron páginas tipo "chat with business" / business.site obsoletas enlazadas desde el sitio (`gbp_deprecation_lint.py` → 0 hallazgos).
- El teléfono "+34 600 26 35 56" que aparece en `src/docs/seo-research.md` (documento de investigación interno) **no está publicado en ningún sitio en vivo** — es un artefacto de la investigación previa, no un problema de NAP real. Igualmente, conviene limpiarlo del documento para que no confunda en el futuro.

## Contenido geo-local: NO crear páginas de barrio

Un solo local en el Eixample no justifica páginas de "barbería en Sant Gervasi" o similares — sería contenido fino y canibalizaría la home, que ya está bien optimizada para "barbería Barcelona" / "barbería Eixample" / "visagismo Barcelona". Confirmado: no proponer páginas de localización adicionales.

## Catalán: no es prioridad (juicio profesional, no medido con datos de volumen — no hay acceso a keyword tool)

Barcelona es bilingüe, pero la intención de búsqueda comercial local ("barbería", "peluquería hombre", "corte de pelo") se concentra abrumadoramente en castellano incluso entre catalanoparlantes — es un patrón consistente y bien documentado en el comportamiento de búsqueda local en Cataluña para servicios, no específico de este negocio. Para una barbería de un solo barbero sin equipo de marketing, traducir toda la web al catalán es esfuerzo alto para un retorno bajo. Si el dueño quisiera una señal simbólica de arraigo local con coste mínimo, podría añadir 1-2 frases en catalán en la sección "About" (ya existe en ES/EN) — opcional, no urgente.
