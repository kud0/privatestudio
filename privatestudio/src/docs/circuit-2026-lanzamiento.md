# Runbook de lanzamiento — Circuit 2026 (viernes 31 jul)

## 🔴 CORRECCIÓN DE HORARIO (31 jul) — el dato estaba mal en TODAS partes

Reni detectó el error al instante. Fuente autorizada: `open_hours` de la configuración de Booksy,
leída vía API el 31 jul.

**HORARIO REAL: lunes a viernes 11:00–20:00 · sábado 11:00–19:00 · domingo cerrado.**

Evidencia cruzada del sábado (Booksy config dice 20:00, la web dice 19:00):
los últimos huecos libres de los dos sábados del festival son **18:20 (día 1) y 18:15 (día 8)**;
entre semana llegan a 19:15. Con un servicio de 35 min, eso encaja con cierre a las 19:00.
**Pendiente de que Reni confirme 19:00 vs 20:00.**

### La web se contradecía a sí misma en tres sitios

| Fuente | Decía | Estado |
|---|---|---|
| `Layout.astro` (schema LocalBusiness) | L–V 10:00–20:00 · Sáb 10:00–15:00 | ❌ corregido |
| `FAQ.astro` (schema FAQPage) | L–V 10:00–20:00 · Sáb 10:00–15:00 | ❌ corregido |
| `Footer.astro` | L–V 11:00–20:00 · Sáb 11:00–19:00 | ✅ ya correcto |
| `ui.ts` (FAQ visible, ES y EN) | L–V 11:00–20:00 · Sáb 11:00–19:00 | ✅ ya correcto |

Los dos erróneos eran **datos estructurados que Google lee** para Maps y los resultados de
búsqueda: la ficha podía estar anunciando que cierran a las 15:00 los sábados. Sin desplegar aún.

### Capacidad real de agenda (API de Booksy, 31 jul)

Servicio de referencia: CORTE DE CABELLO / MENS HAIR CUT — **20,00 € · 35 min** (variant 2430520).

| Día | Horario | Barberos | Citas libres |
|---|---|---|---|
| sáb 1 | 11:00–19:00 | 2 | 11 |
| dom 2 | cerrado | — | — |
| lun 3 | 11:00–20:00 | 2 | 16 |
| mar 4 | 11:00–20:00 | 2 | 22 |
| mié 5 | 11:00–20:00 | 2 | 11 |
| jue 6 | 11:00–20:00 | 3 | 22 |
| vie 7 | 11:00–20:00 | 3 | 24 |
| sáb 8 | 11:00–19:00 | 2 | 17 |
| dom 9 | cerrado | — | — |
| **Total** | | | **123 citas** |

⚠️ **Cuidado con leer esto como ingreso de la campaña.** Los 123 huecos son **capacidad libre
total**: parte se llenará igual con clientela habitual, Maps y reservas directas de Booksy. Los
ads solo aspiran al **incremental**. Tres correcciones antes de derivar cualquier presupuesto:

1. **Total ≠ atribuible a ads.** Falta el dato de cuántos se llenan solos en una semana normal
   de agosto. Sin él, cualquier cifra de retorno es una ilusión. Se puede medir con el mismo
   endpoint: dos consultas separadas 24 h dan la velocidad natural de reserva.
2. **Precio ≠ margen.** El techo se calcula sobre la contribución marginal de llenar una silla
   vacía (comisión del barbero aparte), no sobre los 20 € del ticket.
3. **El ticket de 20 € es solo el corte.** El catálogo real va de 4 € a 80 €, mediana 16 €.

**Sanity check útil con el CPC real (€0,31):** hacen falta ~10–20 clics por reserva para que
salga a €3–6. Ese es el listón que debe superar la campaña, no el "potencial de 2.460 €".

**Consecuencia para el calendario:** cae la tesis de "el viernes 7 es el día clave porque el
sábado es media jornada". El sábado 8 es jornada completa y es el día del Main Event → es el día
de máxima inversión, con el viernes 7 como respaldo.

### Endpoint de disponibilidad (funciona, verificado)

```
POST https://es.booksy.com/core/v2/customer_api/me/businesses/90283/appointments/time_slots
Headers: x-api-key: web-e3d812bf-d7a2-445d-ab38-55589ae6a121 · x-app-version: 3.0
         content-type: application/json · referer: https://booksy.com/
Body: {"subbookings":[{"service_variant_id":2430520,"staffer_id":-1}],
       "start_date":"2026-08-01","end_date":"2026-08-09"}
```
Devuelve `time_slots` (unión) y `staff_time_slots` (por barbero). Sin login.


## ⚠️ AUDITORÍA DE LA CUENTA DE RENI (31 jul, tras obtener acceso) — INVALIDA SUPUESTOS PREVIOS

**La cuenta NO es nueva.** Datos desde 30 nov 2024, leídos en pantalla:

| Métrica (histórico total) | Valor |
|---|---|
| Coste | **€3.672,16** |
| Clics | 11.836 |
| Impresiones | 233.397 |
| CTR | 5,07% |
| **CPC medio** | **€0,31** |
| "Conversiones" | 883 (ojo, ver abajo) |

### Las 5 campañas

| Campaña | Tipo | Puja | Presupuesto | Conv. | Coste/conv. | Coste |
|---|---|---|---|---|---|---|
| **2025 GA** | Search | Maximize clicks | €0,50/día | 835 | **€1,33** | €1.110,86 |
| **Tu Barbería y Peluquería** | P.Max | Max conversions | €0,50/día | 48 | **€37,09** | €1.780,35 |
| ENG_TRAFICO_WEB | Search | Max conversions | €3,18/día | 0 | — | €215,34 |
| Performance Max MV | P.Max | Max conversions | €3,33/día | 0 | — | €307,39 |
| Campaña Busqueda MV | Search | Max conversions | €400 total (dic–ene) | 0 | — | €258,21 |

Presupuesto total activo de la cuenta: **€1,00/día** (= las dos de €0,50). Las otras tres,
paradas o terminadas. Las dos activas son las únicas con optimization score (92,9% y 69,9%).

### 🔴 El hallazgo más importante: la conversión que importa está ROTA

Objetivos de conversión configurados y su estado real:

- Phone call lead — Activo (5 de 5 campañas)
- Contact — Activo (1 de 5)
- **Book appointment — `Misconfigured`** ← la reserva, el único KPI de negocio real
- Get directions — Activo (1 de 5)
- Engagement — Activo (0 de 5)
- **Page view — Activo** (489 resultados) ← una visita a página contada como conversión

**Consecuencias:**
1. Las 883 "conversiones" son en su mayoría señales blandas (llamadas, contactos, cómo llegar,
   page views), **no reservas verificadas**. El €1,33/conv de "2025 GA" NO es €1,33 por reserva.
2. El Smart Bidding de las campañas P.Max lleva meses optimizando hacia señales infladas —
   explica el €37,09/conv de "Tu Barbería y Peluquería" (€1.780 gastados, el mayor gasto
   de la cuenta con el peor resultado).
3. **Arreglar "Book appointment" pasa a ser prioridad cero**, y es un trabajo distinto al que
   decía el runbook ("crear conversiones desde cero"): existen, pero están mal.

### Qué invalida esto del plan anterior

- ❌ "Cuenta nueva sin histórico" → falso. Hay 20 meses de datos.
- ❌ "Límite de CPC ~€1,20" → el CPC medio real es **€0,31**. El presupuesto rinde ~4× más de
  lo que asumía el plan. **El techo de inversión hay que recalcularlo con este dato.**
- ❌ "Montar conversiones en 48h" → ya existen; hay que **auditarlas y arreglar la de reserva**.
- ✅ "Maximizar clics durante el festival" → **la conclusión aguanta, pero por otra razón**: no es
  que falten datos de conversión, es que **los que hay no son fiables** hasta arreglar el tracking.
### Qué hay dentro de "2025 GA" (la campaña que funciona)

Un **único** ad group, "Gruppo di annunci 1", con ES y EN mezclados — justo lo que el plan decía
que no había que hacer. Keywords activas y su CPC real:

| Keyword | Concordancia | Impr. | Clics | CPC | Estado |
|---|---|---|---|---|---|
| "barber" | Frase | 9.215 | 452 | €0,22 | Eligible |
| asesoramiento corte de pelo hombre barcelona | Amplia | 10.229 | 392 | €0,18 | Eligible |
| "barberia barcelona" | Frase | 4.246 | 362 | €0,26 | Eligible |
| "barberia cerca de mi" | Frase | 8.366 | 311 | €0,23 | ⚠️ **Rarely shown (low Quality Score)** |
| "barberia" | Frase | 4.374 | 268 | €0,24 | Eligible |
| "barbería" | Frase | 6.256 | 244 | €0,23 | Eligible |
| "barbershop" | Frase | 5.828 | 205 | €0,26 | Eligible |
| "barber near me" | Frase | 6.011 | 163 | €0,23 | Eligible |

**Ya cubre ES y EN.** Faltan del plan: haircut barcelona, men's haircut barcelona, beard trim,
english speaking barber, barber eixample.

### Destinos reales del tráfico (informe de páginas de destino)

| Destino | Clics | Coste | Nota |
|---|---|---|---|
| https://www.barberbarcelona.es/ | 5.242 | €1.224,02 | OK (200). La ruta `/barberia/barcelona` del anuncio es **display path cosmético**, no una URL rota — verificado |
| business.google.com | 2.493 | €1.190,43 | P.Max mandando tráfico a la ficha, €0,48 CPC |
| booksy.com/es-es/90283… | 1.941 | €189,09 | **€0,10 CPC — el destino más barato con diferencia** |
| https://www.privatestudiobarber.com/ | 885 | €114,79 | ⚠️ **Dominio caído: HTTP 522.** Dominio antiguo que sigue recibiendo tráfico de pago |

### 🔴 Decisión propuesta (pendiente de OK de Alex): NO crear campaña nueva

Escalar y arreglar "2025 GA" en vez de construir de cero, porque:

1. Ya tiene las keywords del plan (ES y EN), 20 meses de histórico y quality score acumulado.
2. Una campaña nueva **competiría contra ella por las mismas keywords** (auto-competencia:
   sube el CPC y parte de quality score cero).
3. Sus problemas son arreglables en la ventana que tenemos:
   - Separar el ad group único en **ES** y **EN** → arregla la relevancia y probablemente el
     "Rarely shown" de "barberia cerca de mi", que es la keyword local más valiosa.
   - Subir el presupuesto (hoy €0,50/día).
   - Añadir las keywords EN que faltan.
4. En paralelo: arreglar el objetivo **Book appointment (Misconfigured)** y quitar **Page view**
   como objetivo de conversión (infla los números y engaña al smart bidding).

**A valorar, no decidido:** pausar la P.Max "Tu Barbería y Peluquería" durante el festival
(€0,50/día, €37,09/conversión, €1.780 gastados — el mayor gasto con el peor resultado) y mover
ese presupuesto a Search. Y quitar privatestudiobarber.com (dominio caído) de donde esté puesto.


> Ventana real: acceso a las 11:00 en casa de Reni · Alex se va a las 13:00 (cita 13:30) · festival empieza sábado 1.
> Etiquetas: todo lo marcado [SIN VALIDAR] o [SI SE CONFIRMA] necesita dato real antes de usarse.

## API de Google Ads — estado a 31 jul 09:55

- **Cuenta manager propia:** Alex Sole - Manager, ID **797-490-8380**.
- **Developer token:** guardado en `~/.zshrc` como `GOOGLE_ADS_DEVELOPER_TOKEN`.
- **Nivel de acceso: Explorer Access** (subió solo de "Test Account" al completar los Developer Details).
  Según documentación oficial: Explorer **sí permite llamadas contra cuentas de producción**,
  con límite de **2.880 operaciones/día** (suficiente de sobra para leer métricas y ajustar
  presupuestos a diario). Restringe: creación de cuentas, gestión de usuarios, Keyword Planner,
  audience insights y facturación — nada de eso hace falta para la automatización diaria.
- **Corregido en el API Center (31 jul):** Company type `Independent Google Ads Developer` →
  **`Agency/SEM`** (el primero dice literalmente "You do not manage Google Ads campaigns for
  clients", lo contrario del caso real). Intended use reescrito en inglés: gestión de cuentas de
  clientes vía manager + automatización de presupuesto ligada a capacidad real de agenda.
- **Basic Access** (15.000 ops/día + Keyword Planner): 5 días laborables de revisión y la
  documentación pide **vincular antes todas las cuentas activas al manager**. Se solicita la
  semana que viene, con la cuenta de Reni ya vinculada. No bloquea nada ahora.
- **Falta para poder llamar a la API:** credenciales OAuth2 (proyecto en Google Cloud, client ID +
  secret, refresh token). No depende de Reni. ~30 min.
- **Solicitud de vinculación ENVIADA (31 jul 10:35):** cuenta de Reni **608-571-5182** →
  manager Alex Sole (797-490-8380). Solicitada por alexsole@gmail.com, **caduca el 30 ago**.
  Visible en Cuentas → Sub-account settings → *Sent link requests* (acción "Withdraw" para
  retirarla). **Pendiente de que Reni la acepte desde su cuenta** (aceptar vinculaciones de
  manager es permiso de administrador).
- **Aprendido por el camino (importante para la automatización):** las acciones sensibles de
  Google Ads (vincular cuentas) disparan el reto **"Confirm it's you"** de Google, que un
  navegador automatizado no puede pasar — hace falta Alex delante. Los cambios no sensibles
  (Company type, Intended use) sí pasan. Conclusión: **conducir Google Ads por navegador no es
  fiable cuando Alex no está; la vía robusta es la API con OAuth**, cuyas llamadas no reciben
  estos retos una vez emitido el refresh token.
- **Sigue bloqueado por lo mismo:** la API solo puede operar cuentas a las que tengamos acceso.
  Sin el OK de Reni no hay nada que automatizar.

## Estado a 30 jul (noche)

- **Acceso admin:** solicitud de alexsole@gmail.com pendiente de que Reni la apruebe (vista en su pantalla, 30 jul).
- **Web `?lang=en`:** implementado y probado EN LOCAL. **Sin deploy** — repo vinculado a Vercel (proyecto `privatestudio`), listo para subir.
- **Presupuesto:** sin cifra. Se deriva de huecos × ticket (pregunta a Reni a las 11).
- **Decisiones abiertas:** Festival Express y su precio (Reni) · reparto ~90% EN (Alex) · franja dom 2 tarde (Alex).

## Esta noche / antes de las 11

1. **Deploy de la web** con `?lang=en` (commit + push → Vercel). Sin esto, la URL final de los anuncios EN aterriza en español.
2. **App móvil de Google Ads en el móvil de Alex.** Es el kill switch real mientras estés fuera: pausar campaña y cambiar presupuesto desde el teléfono. Tras tener acceso, verificar que aparece la campaña y el botón de pausa.
3. Si el Mac se queda de puente con el remote: **desactivar reposo** (`caffeinate -dims` en una terminal, o Ajustes → Pantalla/Batería). Si el Mac duerme, el remote y cualquier sesión de navegador mueren.

## 11:00 — en casa de Reni (con Reni delante, ~15 min)

> Alex está delante del PC de Reni: **no hay que explicarle nada, lo hace Alex directamente** en su
> pantalla. Cuenta de Reni: privatestudio2@gmail.com.

0. **Apuntar el ID de cliente de 10 dígitos** de la cuenta de Reni (arriba, junto al nombre de
   cuenta). Sin ese número no se puede mandar la solicitud de vinculación al manager: verificado
   en la UI — el diálogo "Link existing accounts" pide *"Enter or paste your customer IDs, one per
   line — e.g., 123-456-7890"*, **no acepta email**.
1. Login de Reni → Google Ads → **Administración → Acceso y seguridad** → tabla "Solicitudes de
   actualización de usuario" → **aprobar** "Añadir usuario: alexsole@gmail.com" (o crear la
   invitación de cero con el botón **+** → alexsole@gmail.com → nivel **Estándar** si Admin no
   es posible). **No tocar "REVOCAR SOLICITUD".**
1b. **Opcional pero recomendado:** con el ID en mano, desde el manager de Alex
   (Cuentas → **+** → *Link existing account*) mandar la solicitud de vinculación y aceptarla
   desde la cuenta de Reni ahí mismo. Deja la cuenta bajo el manager 797-490-8380 → habilita
   la API (Explorer Access) y prepara el Basic Access de la semana que viene.
2. **Facturación:** comprobar que hay método de pago activo. Si no, añadir la tarjeta de Reni ahí mismo. *(Único paso que exige a Reni sí o sí — sin tarjeta no se sirve ni un anuncio.)*
3. Alex acepta la invitación desde su correo (vale desde el móvil). A partir de aquí ya no hace falta el PC de Reni.
4. **Preguntas a Reni aprovechando que estáis juntos:**
   - ¿Cuántos huecos libres hay del 1 al 9 y a qué ticket medio? → **presupuesto = huecos × ticket** (techo racional).
   - ¿Cierra el "Festival Express" (corte+barba ~45 min, precio cerrado)? ¿A qué precio? *(Su pricing, no nuestro.)*
   - ¿Hay inglés en silla y quién contesta el teléfono en horario de anuncios? *(Condiciona una línea de anuncio, ver RSAs.)*
   - Nota y nº de reseñas del Business Profile. *(Condiciona otra línea.)*
5. Si da tiempo: vincular Google Business Profile ↔ cuenta de Ads (también se puede después desde el acceso de Alex).

## 11:15–13:00 — montaje (Alex desde su portátil + agente, ~1h30)

Orden de clicks:

1. Nueva campaña → **Búsqueda** → crear sin orientación de objetivo → **solo Red de Búsqueda** (desmarcar socios de búsqueda y Display).
2. **Ubicación:** Barcelona (ciudad) · opciones de ubicación → **Presencia**. Después de crear: añadir **radio ~1 km sobre el Gaixample con ajuste +20–25%** (Ubicaciones → ajustes de puja).
3. **Idiomas: todos.**
4. **Puja:** Maximizar clics + **límite de CPC 1,20 €** [cifra de trabajo — el ajuste Gaixample suma por encima del límite].
5. **Presupuesto diario:** techo semanal ÷ días activos (cifra pendiente de la pregunta de huecos).
6. **Ad schedule:** L–V 11:00–20:00 · Sáb 11:00–19:00 · Dom 2: 17:00–23:00 solo si Alex confirma la franja "reserva para mañana" · Dom 9: nada.
7. **Ad groups:** EN (núcleo) · Marca · ES (mínimo, si se decide activarlo).
8. Pegar keywords y negativas (bloques abajo).
9. **Recursos:** ubicación (requiere GBP vinculado) · llamada **+34 624 367 153** · enlaces de sitio (Reservar / Servicios / Cómo llegar) · textos destacados (Eixample, LGBTQ+ friendly).
10. Pegar RSAs (bloques abajo).
11. **Conversiones:** llamadas desde anuncio (nativo de Ads) + clic saliente a Booksy vía GTM (contenedor `GTM-MR7LGNJL` ya en la web). Si el evento GTM no da tiempo antes de las 13:00: quedan las llamadas y el clic Booksy se monta el sábado a primera hora. Con 1h30 debería dar.

## Bloques para pegar

### Keywords EN — concordancia de frase; exacta en las 2 primeras
```
"barber barcelona"
"barbershop barcelona"
"haircut barcelona"
"men's haircut barcelona"
"barber near me"
"beard trim barcelona"
"english speaking barber barcelona"  [SIN VALIDAR volumen — Keyword Planner al tener acceso]
```

### Keywords Marca
```
"private studio barcelona"
"private studio barberia"
```

### Keywords ES (solo si el grupo se activa)
```
"barbería barcelona"
"barbero eixample"
"corte de pelo hombre barcelona"
"barbería cerca de mí"
"arreglo de barba barcelona"
```

### Negativas (nivel campaña)
```
empleo, trabajo, job, vacante, curso, course, academy, formación,
barato, cheap, free, gratis, mujer, women, ladies,
domicilio, home service, madrid, valencia, sevilla,
tutorial, how to cut, productos, shop online, maquinilla
```

### RSA — grupo EN
URL final: `https://www.barberbarcelona.es/?lang=en` **(requiere el deploy previo)**

Titulares (≤30 caracteres — el editor de Google valida al pegar):
```
Premium Barber Barcelona
Men's Haircut in Eixample
Book Online in Minutes
Same-Day When Available
Cut & Beard Specialists
Muntaner 172 · Eixample
LGBTQ+ Friendly Studio
Look Sharp This Weekend
Beard Trim & Brows
Face-Shape Consulting
Private Studio Barcelona
Walkable From Your Hotel
Open Mon–Sat
English Spoken              [SOLO SI SE CONFIRMA inglés en silla]
Rated 4,X★ by Clients       [SOLO SI SE CONFIRMA — poner la nota real del GBP]
```

Descripciones (≤90):
```
Premium men's grooming in Eixample. Book online via Booksy or call. Same-day if available.
Haircut, beard & brows by image consultants. Muntaner 172. Booking takes 2 minutes.
Look your best this week in Barcelona. Online booking. LGBTQ+ friendly studio.
Your barber in central Barcelona, steps from Eixample. Limited slots — book now.
```

### RSA — grupo ES
URL final: `https://www.barberbarcelona.es/`

Titulares:
```
Barbería Premium Barcelona
Corte de Pelo en Eixample
Reserva Online en 2 Min
Corte + Barba de Experto
Muntaner 172 · Eixample
Asesoría de Imagen Real
Visagismo Profesional
Private Studio Barcelona
Cita Hoy Si Hay Hueco
Abierto Lun–Sáb
```

Descripciones:
```
Barbería premium con asesoría de imagen en Eixample. Reserva por Booksy o llámanos.
Corte, barba y cejas según tu tipo de rostro. Muntaner 172, Barcelona. Reserva online.
Un corte elegido para ti, no "lo de siempre". Reserva en 2 minutos. Huecos limitados.
```

> Sin claims de precio ni "Festival Express" en los anuncios hasta que Reni cierre el precio.
> Si lo cierra a las 11: añadir titular `Festival Express 45 Min` + una descripción con el precio.

## 13:00 en adelante — Alex fuera todo el día

| Quién | Qué | Cómo |
|---|---|---|
| Agente | Lee huecos ~14:00 y ~18:00 | Página pública de Booksy (sin login): booksy.com/es-es/90283_private-studio_barberia_48863_barcelona → aviso al móvil con veredicto: ok / bajar / pausar |
| Alex | Actúa si hace falta | App Google Ads del móvil: pausar campaña o tocar presupuesto (30 seg) |
| Google | Revisión de anuncios | Suele ser <1 día laborable [orientativo de Google, no garantizado]. Publicado antes de las 13:00 → probable activo por la tarde. El daily cap acota el gasto en cualquier caso. |

- **Plan C (frágil, no contar con él):** dejar sesión de Google logueada en el navegador Playwright antes de irte. Si Google pide re-verificación o 2FA durante el día, muere y no hay quien la reviva sin ti.
- **Sábado 1, 8:30:** primer ciclo del protocolo diario — huecos de hoy+mañana → presupuesto del día.
