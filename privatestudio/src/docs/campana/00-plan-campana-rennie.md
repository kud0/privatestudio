# Plan de Campaña — Private Studio (Rennie) × OtraCita

**Fecha:** 30 de julio de 2026
**Negocio:** Private Studio — Carrer de Muntaner 172, BAJO 01, 08036 Barcelona (Eixample)
**Web:** www.barberbarcelona.es
**Fundador:** Renato Rojas ("Rennie")
**Canales:** Google Ads + Meta (Instagram/Facebook)
**Contexto:** lanzamiento de OtraCita.es (plataforma de reserva propia) la primera semana de agosto de 2026

> Documentos relacionados:
> - `01-plan-medicion.md` — implementación técnica de píxeles, eventos y conversiones
> - `02-copys-creatividades.md` — anuncios listos para copiar/pegar (ES/EN)

---

## 1. Por qué esta campaña es distinta a cualquier otra que hayamos hecho

Hoy la web manda todas las reservas a **Booksy** (dominio externo). Eso significa que:

- Google Ads y Meta **no ven la conversión real**. Solo vemos clics de salida.
- Las pujas automáticas (Smart Bidding, Advantage+) no tienen señal que optimizar → gastan a ciegas.
- No podemos hacer remarketing de "empezó a reservar y no terminó", que es el segmento más rentable que existe.
- No podemos asignar valor económico (20 € de un corte básico vs. 122 € de una membresía).

Con **OtraCita.es** el embudo entero pasa a ser nuestro: web nuestra + reserva nuestra + píxel nuestro + servidor nuestro. Eso desbloquea cuatro cosas que un competidor con Booksy/Treatwell no puede hacer:

1. **Conversión real medida** (`booking_completed`) con valor en euros por servicio.
2. **Conversiones de servidor** (Meta CAPI + Google Enhanced Conversions), inmunes a bloqueadores y a iOS.
3. **Remarketing de carrito abandonado** de reservas (inició y no confirmó).
4. **Conversiones offline**: importar a Google/Meta quién *apareció de verdad* a la cita y cuánto gastó, no solo quién reservó. Esto es lo que separa una campaña que "trae clics" de una que trae clientes que se sientan en la silla.

**Conclusión estratégica:** no hay que meter presupuesto fuerte hasta que la medición esté cerrada. Primero infraestructura, luego piloto, luego escalar. El calendario de abajo está construido sobre eso.

---

## 2. Punto de partida (auditoría rápida de lo que ya existe)

| Activo | Estado | Acción |
|---|---|---|
| Web Astro (barberbarcelona.es) | ✅ Rediseñada, bilingüe ES/EN, rápida | Añadir landings de campaña |
| SEO técnico + schema BarberShop | ✅ Hecho (feb 2026) | Mantener |
| Blog (9 artículos ES/EN) | ✅ Publicado | Alimenta remarketing |
| FAQ (12 preguntas ES/EN) | ✅ Publicado | Reutilizar como copy de anuncios |
| Google Tag Manager | ✅ Instalado (`GTM-MR7LGNJL`) | Contenedor por configurar |
| GA4 | ⚠️ Sin verificar en el código | Configurar vía GTM |
| Meta Pixel | ❌ **No existe en la web** | Instalar (bloqueante) |
| Conversión Google Ads | ❌ No existe | Crear (bloqueante) |
| Banner de cookies / Consent Mode v2 | ❌ **No existe** | Obligatorio legal + técnico (bloqueante) |
| Página de gracias post-reserva | ❌ No existe | Crear con OtraCita |
| Landings específicas de campaña | ❌ No existen | Crear 3 |
| Reserva | Booksy (externo) | Migrar a OtraCita |
| Popup de membresías | ⚠️ Salta siempre a los 2 s | Limitar (mata la conversión de tráfico pagado) |
| NAP (teléfono) | ⚠️ Inconsistente: schema/FAQ dicen **624 367 153**, el informe SEO dice **600 26 35 56** | Unificar antes de anunciar |
| Google Business Profile | ✅ 5,0★ según informe de febrero | Vincular a Google Ads |
| Instagram @private.studiobcn | ✅ Activo | Fuente de creatividades |

**Bloqueantes reales antes de gastar el primer euro:** Meta Pixel, conversión de Google Ads, banner de consentimiento y evento de reserva completada en OtraCita. Todo lo demás se puede hacer en paralelo.

---

## 3. Posicionamiento y mensaje

Private Studio **no compite por precio**. Compite por criterio. El corte premium está a 25 €, que en Barcelona no es caro — es el argumento perfecto: *experiencia de barbería premium a precio de barbería normal*.

**Idea central:** "No te cortamos el pelo. Te diseñamos la cara."
Visagismo + asesoría de imagen es el diferencial que ni Barbieri Abbate, ni Kingsman, ni BIONDO comunican bien. Wess Barber y Josep Pons sí lo tocan — hay que ganarles en volumen de contenido y en velocidad de respuesta, no en precio.

**Tres ángulos de campaña, uno por público:**

| Ángulo | Público | Servicio gancho | Precio de entrada |
|---|---|---|---|
| **A — Visagismo / imagen** | Profesional 30-50, Eixample/Sant Gervasi, busca criterio no barato | Corte Premium + Cejas | 28 € |
| **B — Ritual Presidencial** | Hombre 28-45 que se auto-regala una experiencia | Corte + Ritual de Barba | 36 € |
| **C — Expat & English** | Expat/turista de negocios 25-45, inglés, poca lealtad al barbero local | Premium Haircut | 25 € |

Y un cuarto ángulo transversal, para el segundo mes:

| **D — Private Club** | Cliente que ya vino 1-2 veces | Membresías 3/4 sesiones | 65,75 € – 122,05 € |

**Lo que NO hacemos:** descuentos agresivos de primera visita ("50% off"). Destruyen el posicionamiento premium y atraen cazadores de ofertas que no vuelven. El incentivo de entrada es **valor añadido** (diagnóstico de visagismo incluido, cejas incluidas la primera visita), no rebaja.

---

## 4. Economía de la campaña (cómo sabemos si funciona)

Datos reales del menú de servicios:

- Ticket medio estimado: **25–30 €** (corte premium 25 €, +cejas 28 €, +ritual 36 €)
- Frecuencia recomendada: cada 3-4 semanas → **~12 visitas/año** si el cliente se queda
- **LTV a 12 meses de un cliente que repite: ~300 €**
- Membresía de 3 sesiones: 65,75 € cobrados por adelantado

Esto define los límites:

| Métrica | Objetivo | Techo aceptable |
|---|---|---|
| CPA por **reserva online** (nuevo cliente) | ≤ 10 € | 18 € |
| CPA por **membresía vendida** | ≤ 25 € | 40 € |
| % de reservas que son cliente nuevo | ≥ 60 % | — |
| Tasa de repetición a 60 días | ≥ 35 % | — |

Un CPA de 15 € para un cliente que vale 300 € al año es un negocio excelente **siempre que repita**. Por eso el KPI que manda a partir del mes 2 no es el CPA, es la **tasa de repetición**, y por eso la membresía es el objetivo final del embudo.

> ⚠️ Los CPC y CPM que aparecen abajo son **estimaciones de partida** para dimensionar el presupuesto. Se recalculan con datos reales en la primera semana de piloto (Keyword Planner + datos propios). No los tomes como cifras cerradas.
> Estimación de trabajo: búsqueda local Barcelona 0,30–0,90 €/clic; Meta Barcelona 4–9 € CPM. Con 2-4 % de conversión en landing propia, sale un CPA de 10-20 € — coherente con los objetivos de arriba.

---

## 5. Calendario en 4 fases

### Fase 0 — Infraestructura (31 jul → 9 ago) · Gasto en ads: 0 €

Mientras OtraCita se lanza, se cierra la medición.

- [ ] Crear/vincular cuentas: Google Ads, Meta Business Manager, GA4, Google Merchant no aplica
- [ ] Vincular **Google Business Profile ↔ Google Ads** (extensión de ubicación y "Cómo llegar")
- [ ] Instalar en GTM: GA4, Meta Pixel, Google Ads (conversion linker + tag)
- [ ] Instalar **CMP + Consent Mode v2** (obligatorio en España/UE; sin esto Google degrada audiencias y Meta pierde datos)
- [ ] Implementar el `dataLayer` de la web (ver `01-plan-medicion.md`)
- [ ] **Decisión de arquitectura:** publicar OtraCita en `reservas.barberbarcelona.es` (subdominio) en lugar de `otracita.es/private-studio`. Mismo sitio a efectos de cookies → atribución mucho más limpia y sin configurar cross-domain. Si va en dominio propio, hay que configurar medición entre dominios sí o sí.
- [ ] Página `/gracias` post-reserva con el evento de conversión
- [ ] Unificar teléfono en web, GBP, Booksy/OtraCita y redes
- [ ] Limitar el popup de membresías (1 vez por sesión, o exit-intent — hoy salta siempre a los 2 s y penaliza al tráfico pagado)
- [ ] Crear 3 landings de campaña (ver §8)

### Fase 1 — Piloto de calibración (10 → 31 ago) · ~350 € total

Agosto en Barcelona: el local se va de vacaciones, el turista y el expat se quedan. No es el mes para escalar, **es el mes perfecto para aprender barato**.

- Presupuesto: **Google 200 € · Meta 150 €** (≈ 16 €/día combinados)
- Objetivo real: no facturar, sino **acumular ≥ 30 conversiones** para que los algoritmos salgan de fase de aprendizaje y validar que la medición no miente
- Peso en el ángulo **C (expat/inglés)** y **A (visagismo)**
- Pujas: Google en *Maximizar clics* con CPC máximo limitado (aún no hay datos para tCPA); Meta en objetivo Tráfico o Reservas con optimización a `ViewContent`/`InitiateCheckout` hasta tener volumen
- Al final de agosto: revisión de términos de búsqueda, negativas, creatividades ganadoras

### Fase 2 — Escalado "Septiembre Reset" (1 → 30 sep) · 700–900 €

Septiembre es el mejor mes del año para este negocio: vuelta a la oficina, todo el mundo quiere resetear su imagen. Aquí va el músculo.

- Presupuesto: **Google 450–550 € · Meta 250–350 €**
- Google pasa a **CPA objetivo** (con los datos de agosto ya cargados)
- Se activan las cuatro campañas de Google y los cuatro conjuntos de Meta (§6 y §7)
- Se lanza el ángulo **D (membresías)** solo a remarketing de gente que ya reservó
- Creatividad estacional: "Vuelve a la oficina con otra cara"

### Fase 3 — Retención y valor (oct → dic) · 600–800 €/mes

- Importación de **conversiones offline** (asistió / no asistió, ticket real) → las pujas empiezan a optimizar a cliente real, no a formulario
- Puja por **valor** (`maximizar valor de conversión`), no por volumen
- Campaña específica de membresías + campaña de regalo de Navidad (tarjetas regalo del Ritual Presidencial)
- Objetivo del trimestre: pasar de "captar" a "que el 35 % vuelva"

---

## 6. Google Ads — estructura de cuenta

Ubicación: radio de **4 km** alrededor de Muntaner 172, con ajuste positivo en Eixample, Sant Gervasi, Sarrià y Gràcia. Presencia física ("personas *en* la ubicación", nunca "interesadas en").
Horario: anuncios activos L-V 08:00–20:00, Sáb 09:00–15:00 (+ ventana nocturna 21:00-23:00 en móvil, que es cuando la gente reserva desde el sofá).
Dispositivos: sin excluir, pero móvil es el 70-80 % esperado → todas las landings se validan primero en móvil.

### C1 · Marca (defensiva) — 10 % del presupuesto
`private studio barcelona`, `barberia private studio`, `barber barcelona private`, `renato rojas barbero`
CPC bajísimo. Sirve para que Booksy, Treatwell o un competidor no se lleve a quien ya te busca por nombre. Concordancia exacta y de frase.

### C2 · Búsqueda local genérica ES — 45 %
Grupos de anuncios (uno por intención, con landing propia):

| Grupo | Keywords núcleo | Landing |
|---|---|---|
| Barbería Eixample | `barbería eixample`, `barbería muntaner`, `barbería cerca de mí`, `barbería barcelona` | `/reservar` |
| Corte hombre | `corte de pelo hombre barcelona`, `peluquería hombre barcelona`, `corte premium barcelona` | `/reservar` |
| Barba | `arreglo de barba barcelona`, `afeitado clásico barcelona`, `ritual de barba`, `barbero barba barcelona` | `/ritual-barba` |
| Visagismo / imagen | `visagismo barcelona`, `asesoría de imagen masculina`, `corte según forma de cara` | `/visagismo` |
| Color / canas | `tinte hombre barcelona`, `cubrir canas hombre`, `coloración masculina barcelona` | `/reservar` |

### C3 · Búsqueda EN (expat & turista) — 20 %
`barbershop barcelona`, `men's haircut barcelona`, `english speaking barber barcelona`, `barber eixample`, `best barbershop barcelona`, `beard trim barcelona`
Anuncios y landing en inglés. Este grupo tiene menos competencia local y un cliente con menos sensibilidad al precio.

### C4 · Remarketing / Demand Gen — 25 % (desde fase 2)
Visitantes de la web y del blog que no reservaron, con foco en membresías y en el Ritual Presidencial. Formato display/discovery vertical con las mismas creatividades de Meta.

**Negativas obligatorias (lista compartida):**
`gratis`, `curso`, `cursos`, `escuela`, `academia`, `formación`, `empleo`, `trabajo`, `ofertas de empleo`, `sueldo`, `franquicia`, `alquiler silla`, `sillón barbero`, `maquinilla`, `comprar`, `amazon`, `mujer`, `peluquería mujer`, `niños` *(revisar: si se atiende a niños, quitar)*, `perros`, `tutorial`, `cómo cortar`, `en casa`, `barato`, `low cost`, `10 euros`

**Extensiones (todas, sin excepción):**
- Sitelinks: *Servicios y precios* · *Membresías Private Club* · *Reservar cita* · *Cómo llegar*
- Textos destacados: *Visagismo profesional* · *Productos STMNT* · *Eixample, Muntaner 172* · *Atención en inglés* · *5,0★ en Google*
- Fragmentos estructurados (Servicios): Corte premium, Ritual de barba, Diseño de cejas, Coloración, Depilación facial
- Llamada (con seguimiento de llamadas >30 s como conversión secundaria)
- Ubicación (vinculada a Google Business Profile)
- Precio: Corte premium 25 €, Corte + Cejas 28 €, Corte + Ritual 36 €, Pack 3 sesiones 65,75 €

---

## 7. Meta Ads — estructura de cuenta

Objetivo de campaña: **Ventas / Conversiones** apuntando al evento `Purchase` (reserva completada) en cuanto haya volumen. Antes de eso, optimizar a `InitiateCheckout`.

| Conjunto | Segmentación | Presupuesto fase 2 | Creatividad |
|---|---|---|---|
| **P1 · Local amplio** | Radio 4 km Muntaner 172. Hombres 25-50. Segmentación abierta (Advantage+ audience) — el píxel encuentra mejor que nosotros | 40 % | Transformaciones, visagismo explicado |
| **P2 · Expat / inglés** | Barcelona, hombres 25-45, idioma de la app = inglés, "expatriados" | 20 % | Creatividad en inglés, "your barber in Barcelona" |
| **P3 · Remarketing caliente** | Visitantes web 30 d, **inició reserva y no terminó (7 d)**, vídeo 50 %+, engagement IG/FB 365 d | 25 % | Prueba social, reseñas, "te quedó una cita a medias" |
| **P4 · Lookalike** | LAL 1-3 % de compradores/reservas (requiere ~100 eventos, realista en fase 3) | 15 % | Las creatividades ganadoras de P1 |

**Reglas de creatividad:**
- Todo **vertical 9:16**, pensado para Reels. El feed cuadrado es secundario.
- 3-5 creatividades por conjunto, **renovar cada 2-3 semanas** (la fatiga en radios pequeños de 4 km es brutal: la misma gente ve el anuncio 5-6 veces por semana). Vigilar frecuencia: si pasa de 3, rotar.
- Los primeros 2 segundos deciden. Empezar por el corte terminado, no por el "hola qué tal".
- Rennie a cámara funciona mejor que el vídeo de producto: es un negocio de confianza personal.
- Subtítulos siempre quemados (el 85 % ve sin sonido).

**Canal secundario de alto rendimiento: Click-to-WhatsApp.** En España convierte muy por encima del formulario para servicios locales. Recomendado como conjunto de prueba en fase 2 con 50-80 €, midiendo conversaciones iniciadas como conversión secundaria.

---

## 8. Trabajo de web necesario (CRO)

Mandar tráfico pagado a la home es tirar dinero. La home es una portada de marca, no una página de conversión. Hay que crear tres landings, en el mismo estilo visual pero con una sola llamada a la acción:

| Ruta | Ángulo | Contenido |
|---|---|---|
| `/reservar` | A — genérico local | Encima del pliegue: precio, duración, botón de reserva. Debajo: visagismo, reseñas, mapa, FAQ corta |
| `/visagismo` | A — premium | Qué es, cómo se hace, antes/después, quién es Rennie, reserva |
| `/ritual-barba` | B — experiencia | El ritual paso a paso, foto/vídeo, 36 €, reserva |
| `/en/barbershop-barcelona` | C — expat | Todo en inglés, "we speak English", ubicación, reserva |
| `/gracias` | Confirmación | Dispara la conversión, propone seguir en Instagram y presenta el Private Club |

Además:
- Botón **fijo de reservar** en móvil (barra inferior) en toda la web
- Popup de membresías: máximo 1 vez por sesión, y **desactivado** si la URL trae `utm_source` de campaña (que no interrumpa a quien viene de un anuncio)
- Velocidad: el vídeo del hero es el mayor riesgo de LCP. Medir con PageSpeed antes de escalar; un LCP malo sube el CPC en Google por Quality Score
- Reseñas visibles en la landing (el activo de 5,0★ es de los argumentos más fuertes que hay)

---

## 9. KPIs y ritmo de revisión

**Cuadro semanal (lunes):** gasto, impresiones, clics, CTR, CPC, conversiones, CPA, reservas confirmadas, % nuevos.
**Cuadro mensual:** CPA por canal, tasa de repetición a 60 días, membresías vendidas, ingreso atribuido, LTV estimado.

| KPI | Objetivo fase 1 | Objetivo fase 2 |
|---|---|---|
| Conversiones/mes | ≥ 30 | ≥ 90 |
| CPA reserva | aprender (≤ 20 €) | ≤ 12 € |
| CTR Search (no marca) | ≥ 4 % | ≥ 6 % |
| CTR Meta | ≥ 0,8 % | ≥ 1,2 % |
| Conversión de landing | ≥ 2 % | ≥ 4 % |
| Frecuencia Meta | < 3 | < 3,5 |
| Membresías/mes | — | ≥ 8 |

**Regla de corte:** cualquier grupo de anuncios o conjunto que a los 14 días esté a más del doble del CPA objetivo, se pausa. Sin discusión y sin "démosle una semana más".

---

## 10. Decisiones que necesito de ti (Rennie / Alex)

1. **Presupuesto confirmado** — la propuesta es 350 € en agosto (piloto) y 700-900 € en septiembre. ¿Se ajusta?
2. **Dominio de reserva** — ¿OtraCita va en `reservas.barberbarcelona.es` (recomendado) o en `otracita.es`? Cambia toda la configuración de medición.
3. **Oferta de entrada** — propuesta: *"Primera visita: diagnóstico de visagismo y diseño de cejas incluidos"* sin tocar el precio. ¿O prefieres un descuento explícito?
4. **Teléfono oficial** — ¿624 367 153 o 600 26 35 56? Hay que unificarlo en todas partes antes de anunciar.
5. **Capacidad real** — ¿cuántas citas nuevas por semana se pueden absorber sin reventar la agenda? El presupuesto debe ir atado a la capacidad, no al revés. Si solo caben 15 nuevos/semana, gastar para traer 40 es quemar dinero.
6. **Quién graba las creatividades** — hacen falta 8-10 vídeos verticales para arrancar. ¿Los grabamos en una sesión en el local?
7. **Meta Business Manager y Google Ads** — ¿existen ya las cuentas y los accesos, o hay que crearlas desde cero?

---

## 11. Resumen en una línea

Agosto se usa para montar la medición y aprender barato con turista y expat; septiembre se escala con el presupuesto completo aprovechando la vuelta a la rutina; a partir de octubre se optimiza a cliente que vuelve y a membresías, que es donde está el negocio de verdad. Todo apoyado en algo que la competencia con Booksy no tiene: **el embudo entero medido de punta a punta gracias a OtraCita.**
