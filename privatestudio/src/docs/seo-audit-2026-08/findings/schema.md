# Schema.org / Structured Data Audit — barberbarcelona.es

**Fecha:** 2026-08-03
**Alcance:** 11 URLs (home, blog index, 9 posts). Verificado contra HTML servido en producción (fetch + parse), no solo contra el repo.
**Score Schema: 42 / 100**

Base técnica correcta (JSON-LD válido, tipos activos, sin tipos deprecados) pero con vacíos de alto valor: no hay `hasOfferCatalog` pese a tener el catálogo de precios real disponible en el propio repo, cero `BreadcrumbList` en las 11 URLs, `Article` en los 9 posts sin `image` (bloquea elegibilidad de rich result), y un `SearchAction` que apunta a una búsqueda que no existe (schema falso). Se documenta también, como decisión consciente de NO implementar, por qué `aggregateRating`/`review` en el `BarberShop` serían self-serving y quedarían inelegibles según la política de Google.

---

## Metodología

- Código fuente: `src/layouts/Layout.astro`, `src/components/FAQ.astro`, `src/pages/blog/[...slug].astro`, `src/components/Services.astro`, `src/components/Reviews.astro`, `src/content/blog/config.ts`, `src/i18n/ui.ts`.
- Verificación en producción: `claude-seo run fetch_page.py` + `parse_html.py --json` sobre las 11 URLs de `urls.txt` (home, `/blog/`, 9 posts) — confirmado que el JSON-LD servido coincide con el código fuente en todos los casos.
- Prueba activa del `SearchAction`: fetch de `/` vs `/?q=test` → HTML idéntico (mismo MD5), sin marcado de resultados. El sitio es un build estático de Astro sin lógica de búsqueda.
- `gbp_deprecation_lint.py`: no aplica (no hay chat widget ni business.site). Ningún tipo deprecado (HowTo, SpecialAnnouncement, etc.) detectado en el repo.

---

## Findings

### 1. [CRITICAL] `SearchAction` del `WebSite` apunta a una búsqueda que no existe

- **Evidencia:** `src/layouts/Layout.astro:118-122` — `"target": "https://www.barberbarcelona.es/?q={search_term_string}"`. Verificado en producción: `fetch_page.py "https://www.barberbarcelona.es/?q=test"` devuelve HTML byte-idéntico (mismo MD5) al de `/` sin parámetro. Astro genera un sitio 100% estático; no existe página ni endpoint que procese `?q=`.
- **Por qué importa:** Google exige que el `SearchAction` sea una función de búsqueda real y funcional (Sitelinks Search Box). Esto es actualmente un dato estructurado falso — no un "podría mejorar", sino una afirmación incorrecta sobre el sitio.
- **Fix (recomendado): eliminar el bloque `potentialAction` por completo** hasta que exista una búsqueda real. No re-añadir `SearchAction` a menos que se construya una página de resultados de búsqueda funcional primero.

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Private Studio",
  "url": "https://www.barberbarcelona.es"
}
```

---

### 2. [HIGH] `BarberShop` sin `hasOfferCatalog` ni `areaServed`, pese a tener el catálogo real disponible

- **Evidencia:** `src/layouts/Layout.astro:58-109` — el bloque completo no contiene `hasOfferCatalog` ni `areaServed`, pese a que el catálogo de precios real existe en el propio repo: `src/components/Services.astro:48-106` (23 servicios en 5 categorías, con precio y duración).
- Este es schema veraz y elegible (a diferencia del punto 3 — `aggregateRating`/`review` no van aquí, ver finding aparte). `Person` del `founder` también se enriquece con `jobTitle` (ver finding 6).

**JSON-LD corregido (reemplaza el bloque BarberShop actual):**

```json
{
  "@context": "https://schema.org",
  "@type": "BarberShop",
  "name": "Private Studio",
  "description": "Barbería premium en Barcelona especializada en visagismo y consultoría de imagen masculina",
  "url": "https://www.barberbarcelona.es",
  "telephone": "+34624367153",
  "email": "privatestudio2@gmail.com",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Carrer de Muntaner, 172, BAJO 01",
    "addressLocality": "Barcelona",
    "postalCode": "08036",
    "addressRegion": "Cataluña",
    "addressCountry": "ES"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 41.3925,
    "longitude": 2.1530
  },
  "areaServed": {
    "@type": "City",
    "name": "Barcelona"
  },
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      "opens": "11:00",
      "closes": "20:00"
    },
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": "Saturday",
      "opens": "11:00",
      "closes": "19:00"
    }
  ],
  "priceRange": "€€",
  "image": [
    "https://www.barberbarcelona.es/images/ps-logo3.png"
  ],
  "sameAs": [
    "https://www.instagram.com/private.studiobcn/",
    "https://www.facebook.com/profile.php?id=61574816260980",
    "https://booksy.com/es-es/90283_private-studio_barberia_48863_barcelona"
  ],
  "founder": {
    "@type": "Person",
    "name": "Renato Rojas",
    "jobTitle": "Barbero y visagista"
  },
  "foundingDate": "2024-02-02",
  "hasMap": "https://maps.app.goo.gl/g1CY1yPGPptzhyWx7",
  "paymentAccepted": "Cash, Credit Card",
  "currenciesAccepted": "EUR",
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "Servicios Private Studio",
    "itemListElement": [
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Corte + Asesoría Personalizada" }, "price": "25.00", "priceCurrency": "EUR" },
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Corte de Cabello" }, "price": "20.00", "priceCurrency": "EUR" },
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Corte de Cabello (Premium) + Cejas" }, "price": "28.00", "priceCurrency": "EUR" },
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Corte de Cabello (Largo)" }, "price": "30.00", "priceCurrency": "EUR" },
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Corte de Cabello (Premium) + Diseño de Barba Navaja" }, "price": "30.00", "priceCurrency": "EUR" },
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Asesoría Completa: Cabello + Ritual de Barba" }, "price": "36.00", "priceCurrency": "EUR" },
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Ritual de Barba (Presidencial)" }, "price": "18.00", "priceCurrency": "EUR" },
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Tinturación de Barba" }, "price": "15.00", "priceCurrency": "EUR" },
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Diseño de Barba con Máquina" }, "price": "15.00", "priceCurrency": "EUR" },
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Cover Gray – Camuflaje Natural de Canas" }, "price": "30.00", "priceCurrency": "EUR" },
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Tinturación Rubio / Gris" }, "price": "90.00", "priceCurrency": "EUR" },
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Tinturación de Cabello" }, "price": "80.00", "priceCurrency": "EUR" },
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Matiz Shampoo" }, "price": "10.00", "priceCurrency": "EUR" },
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Mechas o Iluminación Masculina" }, "price": "80.00", "priceCurrency": "EUR" },
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Repolarización Hidratante Capilar" }, "price": "10.00", "priceCurrency": "EUR" },
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Depilación de Cejas con Cera" }, "price": "10.00", "priceCurrency": "EUR" },
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Depilación con Cera (Nariz y Orejas)" }, "price": "10.00", "priceCurrency": "EUR" },
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Cejas con Navaja" }, "price": "4.00", "priceCurrency": "EUR" },
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Combo Waxing" }, "price": "15.00", "priceCurrency": "EUR" }
    ]
  }
}
```

> Precios completos con "+" (ej. tinte rubio "90,00 €+") se han fijado al valor base indicado en `Services.astro`; si el precio real es variable, usar `priceSpecification` con `minPrice` en vez de `price` fijo para esas filas. La lista de servicios de ondulación (`ondulacion-superior`, `ondulacion-completo`) se omitió por brevedad del ejemplo — añadir siguiendo el mismo patrón si se implementa.

---

### 3. [DECISIÓN — NO IMPLEMENTAR] `aggregateRating`/`review` en `BarberShop` sería self-serving review markup

- **Qué se evaluó y se descartó:** meter `aggregateRating` (ratingValue 5.0) y/o un array `review` con los 6 testimonios de `src/components/Reviews.astro:2-39` directamente en el bloque `BarberShop` de `Layout.astro`.
- **Por qué se descarta — política de Google, citada literalmente:** [Review snippet — Google Search Central](https://developers.google.com/search/docs/appearance/structured-data/review-snippet): *"If the entity that's being reviewed controls the reviews about itself, their pages that use `LocalBusiness` or any other type of `Organization` structured data are ineligible for the star review feature."* La política aclara explícitamente que esto aplica igual si las reseñas se insertan directas en el structured data o vienen de widgets de terceros embebidos (menciona Google Business y Facebook reviews como ejemplo).
- **Por qué aplica aquí:** `BarberShop` → `HairSalon` → `HealthAndBeautyBusiness` → `LocalBusiness` → `Organization`. Está de lleno dentro del alcance de la restricción — es el propio negocio mostrando sus propias reseñas, controladas por él.
- **Consecuencia de implementarlo igualmente:** no generaría estrellas en la SERP (inelegible por definición) y es markup engañoso — riesgo de acción manual por "structured data spam" en Search Console, sin ningún upside a cambio.
- **Dónde sí salen las estrellas reales de Private Studio:** por el map pack vía Google Business Profile, canal correcto que no depende de nada de este bloque y no se ve afectado por esta decisión.
- **`reviewCount` real de GBP:** se intentó obtener el total real scrapeando `maps.app.goo.gl` y solo devuelve el shell de la SPA (sin datos server-side). Es irrelevante para esta decisión — el campo no se implementa, así que no hace falta el dato.
- **Decisión:** no añadir `aggregateRating` ni `review` al `BarberShop` (ni a ningún tipo `LocalBusiness`/`Organization` del sitio). Dejar constancia aquí para que esto no se "arregle" añadiéndolo en una revisión futura sin conocer la política.

---

### 4. [HIGH] `Article` en los 9 posts del blog sin `image` (y sin `dateModified`)

- **Evidencia:** Confirmado **en producción** en los 9 posts (`fetch_page.py` + `parse_html.py --json` sobre las 9 URLs de blog de `urls.txt`) — el JSON-LD `Article` servido tiene exactamente estas claves: `@context, @type, headline, description, author, datePublished, publisher, mainEntityOfPage`. Sin `image`. Código fuente: `src/pages/blog/[...slug].astro:18-40`.
- **Causa raíz doble:**
  1. `src/content/blog/config.ts` define `image: z.string().optional()` en el schema de la colección, pero **0 de 9 posts** lo usan en su frontmatter (`grep -L "^image:" src/content/blog/*.md` → los 9 archivos).
  2. Aunque un post tuviera `image` en el frontmatter, el bloque `articleSchema` en `[...slug].astro` **no lo referencia** — la propiedad no está conectada al schema aunque se rellenara.
- **Por qué importa:** `image` es una propiedad requerida por Google para que `Article`/`BlogPosting` sea elegible a rich results. Sin ella, los 9 posts quedan fuera de esa elegibilidad aunque el resto del schema sea válido.
- **Fix:** añadir imagen de portada real a cada uno de los 9 posts (frontmatter `image:`) y conectarla al schema; añadir `dateModified` (usar `date` como fallback si no hay campo de última edición, mejor que omitirlo).

```json
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "Cómo Cuidar tu Barba en Casa: Guía Profesional de Barbero",
  "description": "...",
  "image": "https://www.barberbarcelona.es/images/blog/como-cuidar-barba-en-casa.jpg",
  "author": {
    "@type": "Person",
    "name": "Renato Rojas"
  },
  "datePublished": "2026-02-16T00:00:00.000Z",
  "dateModified": "2026-02-16T00:00:00.000Z",
  "publisher": {
    "@type": "Organization",
    "name": "Private Studio",
    "logo": {
      "@type": "ImageObject",
      "url": "https://www.barberbarcelona.es/images/ps-logo3.png"
    }
  },
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://www.barberbarcelona.es/blog/como-cuidar-barba-en-casa/"
  }
}
```

> Se cambia `Article` → `BlogPosting` (más específico y correcto para contenido bajo `/blog/`; ambos son tipos activos, no es una corrección de un error sino una mejora de precisión). Si no hay presupuesto para fotografía editorial inmediata, usar el logo (`ps-logo3.png`) como `image` de relleno es mejor que omitirla — pero una imagen real por post es lo recomendado a medio plazo (nota: esa imagen de relleno mide referirse a `seo-images`/`seo-image-gen` para dimensiones ≥1200px de ancho, fuera del alcance de este audit de schema).

---

### 5. [HIGH] Cero `BreadcrumbList` en las 11 URLs auditadas

- **Evidencia:** `grep -rn "BreadcrumbList" src --include="*.astro"` → sin resultados. Confirmado ausente en el HTML servido de las 11 URLs (parseadas todas con `parse_html.py --json`).
- **Fix — home:** opcional (es la raíz, no necesita breadcrumb). **Blog index y los 9 posts sí se benefician** (jerarquía Inicio > Blog > Título del post).

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://www.barberbarcelona.es/" },
    { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://www.barberbarcelona.es/blog/" },
    { "@type": "ListItem", "position": 3, "name": "Cómo Cuidar tu Barba en Casa", "item": "https://www.barberbarcelona.es/blog/como-cuidar-barba-en-casa/" }
  ]
}
```

(Para `/blog/` usar solo los dos primeros `ListItem`.)

---

### 6. [MEDIUM] `Person` (fundador/autor) es un stub sin credenciales

- **Evidencia:** `src/layouts/Layout.astro:100-103` (`founder`) y `src/pages/blog/[...slug].astro:23-26` (`author`) — ambos son `{"@type": "Person", "name": "Renato Rojas"}` sin `jobTitle`, `sameAs`, `knowsAbout` ni `description`.
- **Por qué importa:** un `Person` más completo refuerza señales E-E-A-T (relevante para el trabajo paralelo de `seo-content` sobre autoría). No hay una página de biografía dedicada entre las 11 URLs auditadas, así que no se recomienda un `ProfilePage` independiente por ahora — solo enriquecer el objeto `Person` inline (ver bloque `founder` corregido en el punto 2, que ya incluye `jobTitle`).
- **Fix opcional si se crea página de equipo/bio a futuro:** `claude-seo run schema_generate.py profile --name "Renato Rojas" --url ... --job-title "Barbero y visagista" --works-for "Private Studio" --same-as https://www.instagram.com/private.studiobcn/` genera un `ProfilePage` listo para pegar.

---

### 7. [LOW / INFO] `FAQPage` sigue presente — sin beneficio de rich result en Google desde el 7-may-2026

- **Evidencia:** `src/components/FAQ.astro:17-34`, servido igual en producción (confirmado en el JSON-LD parseado de home).
- **Estado:** Google retiró los rich results de FAQ para todos los sitios el 7 de mayo de 2026. Esto se marca como **Info**, no Critical — **no se recomienda quitar el schema** (es inocuo mantenerlo) y **no se afirma beneficio de citación en LLM confirmado** (no hay evidencia que lo respalde).
- **Nota de calidad de datos (no de SERP):** el schema está hardcodeado solo en español (`faqSchemaEs`, `src/components/FAQ.astro:17`), pero el contenido visible de la página cambia a inglés client-side vía `data-i18n` (`src/i18n/utils.ts`). Para un visitante que ve la página en inglés, el schema embebido sigue siendo español. No es un problema de SERP (FAQ ya no genera rich result), pero es una inconsistencia de datos si se usa como fuente para asistentes/LLMs. No se recomienda ninguna acción salvo dejar constancia.

---

### 8. [MEDIUM/OPPORTUNITY] `ReserveAction` vía Booksy — viable pero sin garantía de rich result

- Booksy es el sistema de reservas real (confirmado en `Hero.astro`, `Navbar.astro`, `Services.astro`). Añadir `potentialAction: ReserveAction` es schema.org-válido (`ReserveAction` es un tipo activo, no deprecado) y describe con veracidad una capacidad real del sitio (a diferencia del `SearchAction` del punto 1, que no).
- **Aviso importante:** el rich result "Reserve with Google" de Google requiere una integración de partner (feed específico), no solo JSON-LD en la página. No hay evidencia de que Booksy tenga esa integración activa para este negocio. Se recomienda añadir el bloque igualmente por ser una descripción veraz de la funcionalidad, **sin prometer** un rich result en la entrega.

```json
{
  "@context": "https://schema.org",
  "@type": "BarberShop",
  "...": "resto del bloque igual al punto 2",
  "potentialAction": {
    "@type": "ReserveAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://booksy.com/es-es/90283_private-studio_barberia_48863_barcelona",
      "actionPlatform": [
        "http://schema.org/DesktopWebPlatform",
        "http://schema.org/MobileWebPlatform"
      ]
    },
    "result": {
      "@type": "Reservation",
      "name": "Reserva de cita en Private Studio"
    }
  }
}
```

---

## Resumen de severidad

| # | Título | Severidad | Archivo:línea |
|---|---|---|---|
| 1 | `SearchAction` apunta a búsqueda inexistente (schema falso) | Critical | `src/layouts/Layout.astro:118-122` |
| 2 | `BarberShop` sin `hasOfferCatalog`/`areaServed` pese a tener el catálogo real | High | `src/layouts/Layout.astro:58-109` |
| 3 | `aggregateRating`/`review` self-serving en `BarberShop` — decisión de NO implementar | Decisión documentada | `src/components/Reviews.astro:2-39,144,146` (fuente descartada) |
| 4 | `Article` en 9/9 posts sin `image` ni `dateModified` | High | `src/pages/blog/[...slug].astro:18-40`; `src/content/blog/config.ts` |
| 5 | Cero `BreadcrumbList` en las 11 URLs | High | — (ausente en todo `src`) |
| 6 | `Person` (founder/author) sin credenciales | Medium | `Layout.astro:100-103`; `[...slug].astro:23-26` |
| 7 | `FAQPage` sin beneficio SERP (post 7-may-2026); schema solo en ES vs. página bilingüe | Info | `src/components/FAQ.astro:17-34` |
| 8 | `ReserveAction` para Booksy — oportunidad, sin garantía de rich result | Medium/Opportunity | `Services.astro:2`, `Hero.astro:77` |

**No se detectaron tipos deprecados** (HowTo, SpecialAnnouncement, ClaimReview, VehicleListing, etc.) en ninguna de las 11 URLs.
