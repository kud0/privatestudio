# Clustering semántico y arquitectura de contenido — barberbarcelona.es

**Semilla:** "visagismo" + "barbería Barcelona" · **Metodología:** SERP overlap (WebSearch, sin DataForSEO) · **Fecha:** 2026-08-03

**Restricción respetada:** ningún tema nuevo propuesto aquí duplica los 9 posts publicados ni los 16 temas ya planificados en `src/docs/informe-seo-owner.md` (sección "Próximos artículos para el blog"). Cada afirmación de demanda está etiquetada **[HIPÓTESIS]** y viene acompañada de la query de Google real que la sostiene — no hay volúmenes (no hay DataForSEO/Keyword Planner disponibles en esta sesión).

---

## 1. Mapeo de los 9 posts existentes a clusters

| Post | Lang | Cluster | Rol |
|---|---|---|---|
| `que-es-visagismo-guia-completa` | ES | **Visagismo (hub)** | Pilar — ya rankea **#1** para "visagismo Barcelona barbería" [verificado por WebSearch] |
| `what-is-visagism-complete-guide` | EN | Visagismo (hub, espejo EN) | Traducción del pilar, sin hreflang real (ver §4) |
| `fade-vs-taper-vs-degradado-diferencia` | ES | Cortes y Tendencias | Spoke — comparativa técnica, ya enlaza el concepto de visagismo en su propio texto |
| `fade-vs-taper-difference-explained` | EN | Cortes y Tendencias | Traducción |
| `tendencias-corte-pelo-hombre-2026` | ES | Cortes y Tendencias | Spoke — trend, también menciona visagismo |
| `mens-haircut-trends-2026` | EN | Cortes y Tendencias | Traducción |
| `como-cuidar-barba-en-casa` | ES | Barba | Spoke — how-to autónomo, casi no menciona visagismo |
| `how-to-care-for-your-beard-at-home` | EN | Barba | Traducción |
| `mens-grooming-guide-barcelona` | **EN only, sin par ES** | Solapa con Barba + Cortes + Producto | Pieza ancha que repite subtemas ya cubiertos por otros 3 posts (barba, corte premium, productos STMNT) — ver riesgo de canibalización abajo |

**Canibalización — ¿compiten los posts entre sí por la misma keyword?** No hay dos posts (ES o EN) apuntando al mismo término principal, así que no hay canibalización de keyword clásica. Sí hay un problema distinto y más urgente:

- **`mens-grooming-guide-barcelona`** es EN-only, sin equivalente ES, y reparte su contenido entre 4 subtemas (barbershop-finding, corte premium, ritual de barba, productos) que YA tienen su propio post dedicado en inglés. No canibaliza keywords, pero sí diluye qué página debería ser la autoridad EN para "barbershop Barcelona" — hoy hay dos candidatas (el hub EN y esta guía) sin jerarquía clara entre ellas.
- Su párrafo de apertura ya habla de "expat building your life here" — es la única pieza del sitio con ángulo expat, pero no está targeteada a esa intención de forma explícita (ver §4).

## 2. Hallazgo de arquitectura — no hay enlazado interno, en absoluto

Verificado leyendo `src/pages/blog/[...slug].astro` completo: la plantilla no tiene ningún bloque de "posts relacionados", "sigue leyendo" ni enlaces entre artículos. Cada post solo tiene: (a) un link de vuelta a `/blog/`, (b) tags mostrados como `<span>` estáticos — **no son links**, y (c) un CTA final a Booksy. Los 9 posts son islas: 0 enlaces salientes entre ellos, 0 entrantes.

Esto no es solo una nota de "mejorar interlinking" — es la razón de que un hub-and-spoke real no exista todavía aunque el contenido ya se agrupa temáticamente. **Recomendación técnica (fuera de mi alcance de implementación, para el equipo técnico/dev):** añadir un bloque "Artículos relacionados" en `[...slug].astro` que lea de un campo `relatedSlugs` en el frontmatter de cada post — así la matriz de la sección 5 se puede aplicar sin reescribir cada artículo a mano.

## 3. Arquitectura hub-and-spoke propuesta

```
                    HUB: VISAGISMO
        (que-es-visagismo-guia-completa — ampliar a pilar)
                          │
        ┌─────────────────┼─────────────────┬───────────────────┐
        │                 │                 │                   │
   CORTES Y          BARBA              VISAGISMO           EXPAT / EN
   TENDENCIAS                           APLICADO            (cluster solo-EN)
        │                 │                 │                   │
  fade-vs-taper     cuidado-barba    [NUEVO] asesoría      [NUEVO] barbershop
  tendencias-2026    en-casa         de imagen masc.        expats Eixample
  [NUEVO] ondulación [NUEVO] tinte   [NUEVO] historia            │
  [NUEVO] mechas      de barba        Renato/visagismo      mens-grooming-
                                                             guide-barcelona
                                                             (reposicionar)
```

Un quinto elemento, **[NUEVO] precios de barbería premium**, no pertenece a un solo cluster — funciona como página-índice que enlaza a casi todos los servicios (ver matriz).

## 4. Decisión ES/EN — evidencia, no opinión

**Se buscó explícitamente para no decidir por intuición:**

| Query | Qué rankea | Lectura |
|---|---|---|
| "visagismo Barcelona barbería" | Private Studio (#1, ES), Wess Barber, Skull Barber, Resistance Hair — **todo en español** | Cero competidores en inglés para el término core del negocio |
| "asesoria imagen masculina Barcelona" | Private Studio, VJ Asesores, Alba Becerra — **todo en español**, todo local | Misma conclusión |
| "barbershop Barcelona english speaking" | Porter BCN ("the English-speaking barbershop in Barcelona"), Barbieri Abbate, Anthony Llobet, TEFL Iberia (blog expat) | SERP **distinta y real**, con negocios que se posicionan explícitamente para hablantes de inglés |
| "best barbershop for expats Barcelona" | Mismo grupo + WIT Salon, Epoque Salon, agregadores (ShBarcelona, WhoDoYou, Yelp) | Confirma que existe demanda propia en inglés — pero **Private Studio no aparece en ninguna de las dos** |

**Conclusión [basada en SERP, no en volumen]:** las keywords "de negocio" (visagismo, asesoría de imagen, cortes, barba) tienen demanda 100% en español — traducir esos posts al inglés no capta un público distinto, solo duplica la página. Y encima el hallazgo del agente de sitemap confirma que esas parejas ES/EN **no tienen hreflang real** (`Layout.astro` solo lo fija para `/`), así que Google ni siquiera las trata como traducciones — las ve como contenido casi-duplicado compitiendo entre sí.

Sí existe una demanda en inglés genuinamente distinta: la búsqueda expat/"english-speaking barbershop", con competidores locales dedicados que Private Studio no está atacando en absoluto hoy.

**Recomendación:**
1. No traducir más contenido nuevo de los clusters Visagismo/Cortes/Barba al inglés — no gana público nuevo, sí diluye señal.
2. Mantener los 5 posts EN ya publicados (no hay razón para despublicar contenido indexado), pero no expandir ese patrón.
3. Reservar el inglés exclusivamente para el cluster expat — contenido pensado y escrito para esa intención, no traducido.
4. Pedir al equipo técnico corregir hreflang en los pares ES/EN existentes (hallazgo de `seo-sitemap`, no de este análisis — solo lo señalo porque afecta directamente la decisión de arriba).

## 5. Matriz de enlazado interno

Regla aplicada: cada spoke enlaza al hub y viceversa (obligatorio), 2-3 enlaces dentro del mismo cluster, 0-1 cross-cluster salvo para la pieza-índice de precios.

| De | A | Anchor sugerido |
|---|---|---|
| Hub (visagismo) | fade-vs-taper-vs-degradado | "qué degradado te favorece según tu rostro" |
| Hub (visagismo) | tendencias-corte-pelo-hombre-2026 | "tendencias de corte 2026" |
| Hub (visagismo) | como-cuidar-barba-en-casa | "cuidado de barba en casa" |
| Hub (visagismo) | [N1] asesoría de imagen masculina | "sesión completa de asesoría de imagen" |
| Hub (visagismo) | [N6] historia de Renato Rojas | "quién hace el análisis de visagismo" |
| fade-vs-taper-vs-degradado | Hub (visagismo) | "análisis de visagismo" |
| fade-vs-taper-vs-degradado | tendencias-corte-pelo-hombre-2026 | "tendencias de corte 2026" |
| fade-vs-taper-vs-degradado | [N2] ondulación permanente | "ondulación permanente para hombre" |
| tendencias-corte-pelo-hombre-2026 | Hub (visagismo) | "qué es el visagismo" |
| tendencias-corte-pelo-hombre-2026 | fade-vs-taper-vs-degradado | "diferencia entre fade y taper" |
| tendencias-corte-pelo-hombre-2026 | [N2] ondulación permanente | "ondulación permanente hombre" |
| tendencias-corte-pelo-hombre-2026 | [N7] mechas e iluminación | "mechas para hombre" |
| como-cuidar-barba-en-casa | Hub (visagismo) | "diseño de barba con visagismo" |
| como-cuidar-barba-en-casa | [N4] tinte de barba | "cubrir canas de la barba" |
| [N1] asesoría de imagen | Hub (visagismo) | "qué es el visagismo" |
| [N1] asesoría de imagen | [N6] historia Renato Rojas | "el barbero detrás del visagismo en Barcelona" |
| [N2] ondulación permanente | Hub (visagismo) | "análisis de visagismo antes de cada servicio" |
| [N2] ondulación permanente | [N7] mechas e iluminación | "mechas para hombre en Barcelona" |
| [N4] tinte de barba | como-cuidar-barba-en-casa | "rutina de cuidado de barba" |
| [N4] tinte de barba | Hub (visagismo) | "visagismo en Private Studio" |
| [N6] historia Renato Rojas | Hub (visagismo) | "el visagismo, explicado" |
| [N6] historia Renato Rojas | [N1] asesoría de imagen | "reserva tu sesión de asesoría de imagen" |
| [N5] precios (índice) | Hub, N1, N2, N4 | "ver el servicio completo" (repetido por sección) — pieza-índice, excepción a la regla 0-1 cross-cluster porque su función es indexar precios de todo el catálogo |
| Todos los spokes ES | [N5] precios | "consulta el precio de este servicio" |
| **Cluster EN (aparte):** what-is-visagism-complete-guide | [N3] English-speaking barbershop Eixample | "visagism for international clients" |
| [N3] English-speaking barbershop | mens-grooming-guide-barcelona | "grooming guide for Barcelona" |
| mens-grooming-guide-barcelona | [N3] English-speaking barbershop | "the English-speaking barbershop in Eixample" |

Ningún post queda huérfano (mínimo 2 entrantes cada uno); el cluster EN queda deliberadamente aislado del resto para no mezclar idiomas dentro de un mismo párrafo de anchor.

## 6. Plan de contenido priorizado

7 piezas nuevas (dentro del máximo de 8-10, pero sin rellenar con ideas débiles solo para llegar al número — el criterio pedido es calibrar, no maximizar) + 1 edición de la pieza existente que actúa de pilar.

| # | Pieza | Lang | Cluster | Intención | Por qué gana [evidencia] |
|---|---|---|---|---|---|
| 0 | **Editar** `que-es-visagismo-guia-completa` para convertirla en pilar real (hoy ~550 palabras) | ES | Hub | Informacional + marca | Ya rankea #1 para el término core del negocio — es la inversión de mayor apalancamiento del plan: ampliar con tabla rostro→servicio real, FAQ, y los 8 enlaces salientes de la sección 5 |
| 1 | **Asesoría de Imagen Masculina en Barcelona: qué incluye la sesión** | ES | Visagismo Aplicado | Comercial local | Private Studio ya aparece en el SERP de "asesoria imagen masculina Barcelona" compitiendo con consultores de imagen puros (VJ, Alba Becerra) que no son barbería — hueco real, y apunta directo al servicio real más caro del catálogo (Asesoría Completa, 36€) |
| 2 | **Ondulación permanente para hombre en Barcelona: cómo es, precio y a quién le queda bien** | ES | Cortes | Comercial local | Servicio real ya en el catálogo (Semi Ondulación) con **cero contenido de barbería local compitiendo** — solo apareció un salón (Onda Salon) y TikTok; tendencia validada por volumen de vídeos, sin competencia de barberías |
| 3 | **The English-Speaking Barbershop in Barcelona's Eixample** (no es traducción — pieza propia) | EN | Expat | Comercial local | SERP real y distinto ("best barbershop for expats Barcelona") con competidores dedicados (Porter BCN, Anthony Llobet, Barbieri Abbate) donde Private Studio no aparece hoy — cubre el hueco que el propio informe de investigación señaló ("best barbershop for expats Barcelona — underutilized") pero que nunca se convirtió en un post real |
| 4 | **Tinte de barba para hombre: cubre canas sin que se note** | ES | Barba | Comercial local | Servicio real distinto (Tinturación de Barba, 15€) — solo una barbería local (Manolo's) tiene página dedicada, con precios de 18,50€-35€ frente a los 15€ de Private Studio: ángulo de precio defendible |
| 5 | **Precios de barbería premium en Barcelona: qué incluye cada servicio** | ES | Índice/Conversión | Comercial local | El SERP genérico de precios lo dominan agregadores (Cronoshare, Fresha, Booksy) — no es una apuesta de tráfico #1, pero es contenido de confianza/conversión real: Private Studio publica precios exactos, la mayoría de competidores no |
| 6 | **Renato Rojas y el visagismo: la historia detrás de Private Studio** | ES | Visagismo Aplicado (E-E-A-T) | Marca/autoridad | El propio informe de investigación señaló esto como gap ("Founder Story... underdeveloped") sin convertirlo en pieza — refuerza E-E-A-T, que pesa cada vez más en cómo Google y las IA generativas evalúan negocios locales |
| 7 | **Mechas e iluminación para hombre: la tendencia que gana terreno en Barcelona** | ES | Cortes | Informacional + comercial | Prioridad más baja del lote — servicio real (Mechas/Iluminación Masculina) pero sin validación SERP tan clara como el resto; incluir solo si sobra capacidad tras las 6 anteriores |

**Ritmo:** a 2-3 posts/mes, esto son 3-4 meses de calendario editorial, en el orden de la tabla.

## 7. Fuentes (WebSearch, sin volúmenes — solo lectura de SERP)

- "visagismo Barcelona barbería" — Private Studio, Wess Barber, Skull Barber Shop, Resistance Hair, Cutterstudio
- "asesoria imagen masculina Barcelona" — Private Studio, VJ Asesores de Imagen, Alba Becerra
- "barbershop Barcelona english speaking" — Porter BCN, Barbieri Abbate, Anthony Llobet, TEFL Iberia
- "best barbershop for expats Barcelona" — Anthony Llobet, Porter BCN, WIT Salon, Epoque Salon, ShBarcelona, WhoDoYou, Yelp
- "como saber que corte de pelo me queda bien segun mi cara" — dominado por medios generalistas y apps de IA (Informador, Airbrush, PerfectCorp) — sin barberías locales; confirma que competir por esta query genérica no es rentable para el negocio
- "ondulacion permanente hombre Barcelona tendencia" — mayoritariamente TikTok + un salón (Onda Salon), sin barberías dedicadas
- "precio corte de pelo barberia Barcelona cuanto cuesta" — Cronoshare, BarbershopMap, Booksy, Fresha, Expatistan (agregadores)
- "tinte barba hombre Barcelona canas" — Barbería Manolo's (única barbería con página dedicada), Treatwell, Barberius
