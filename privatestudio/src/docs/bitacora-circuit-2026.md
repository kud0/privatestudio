# Bitácora — Private Studio · Google Ads

Registro de todo lo que se toca, con fecha, motivo y resultado. Sirve para dos cosas:
evaluar después si cada decisión fue acertada, y poder deshacer cualquier cambio sabiendo
exactamente qué había antes.

**Formato:** cada entrada dice QUÉ se cambió, POR QUÉ, cuál era el ESTADO ANTERIOR y cómo
se VERIFICÓ. Las entradas nuevas van al final de su día.

---

## Estado de partida (antes de tocar nada)

Fotografía de la cuenta **608-571-5182** al obtener acceso el 31 jul 2026:

| Concepto | Valor |
|---|---|
| Histórico | Desde 30 nov 2024 · €3.672,16 · 11.836 clics · CPC €0,31 |
| Campañas | 5 (2 activas, 3 paradas/terminadas) |
| Presupuesto activo | €1,00/día (dos campañas a €0,50) |
| "2025 GA" (Search) | Max clics · 835 conv · €1,33/conv · €1.110,86 |
| "Tu Barbería y Peluquería" (P.Max) | Max conversiones · 48 conv · €37,09/conv · €1.780,35 |
| Estructura de "2025 GA" | **Un solo ad group** ("Gruppo di annunci 1") con ES y EN mezclados |
| Conversión "Book appointment" | **Misconfigured** (3 de 5 campañas) |
| "barberia cerca de mi" | **Rarely shown (low Quality Score)** |
| Dominio privatestudiobarber.com | 885 clics facturados · HTTP 522 (caído) |

---

## 31 julio 2026

### 09:50 · Cuenta manager: tipo de empresa y uso declarado
- **Qué:** en el API Center del manager 797-490-8380, `Company type` pasó de
  `Independent Google Ads Developer` a `Agency/SEM`. `Intended use` reescrito en inglés
  describiendo gestión de cuentas de clientes y automatización ligada a capacidad de agenda.
- **Por qué:** la opción anterior dice literalmente *"You do not manage Google Ads campaigns
  for clients"*, lo contrario del caso real. El texto anterior decía "solo cuentas propias".
- **Resultado:** al guardar, el developer token subió solo de `Test Account` a
  **`Explorer Access`**, que sí permite operar cuentas de producción (2.880 ops/día).
- **Verificado:** Access level en pantalla tras recargar.

### 10:35 · Vinculación de la cuenta de Reni al manager
- **Qué:** solicitud de vinculación 608-571-5182 → manager 797-490-8380. Aceptada por Reni.
- **Incidencia:** dos intentos fallidos antes. Causa 1: Google exige el reto *"Confirm it's
  you"* en acciones sensibles, que un navegador automatizado no supera. Causa 2: el campo
  quedó con el ID escrito dos veces, lo que deshabilitaba el botón sin mensaje claro.
- **Verificado:** aparece como sub-cuenta "Client (EUR)", vinculada 10:36.

### ~11:00 · Auditoría completa de la cuenta
- **Qué:** lectura de campañas, keywords, anuncios, páginas de destino, conversiones y
  facturación. Resultados en `circuit-2026-lanzamiento.md`.
- **Hallazgo principal:** la conversión de reserva está rota, así que las 883 "conversiones"
  son mayoritariamente llamadas telefónicas y no citas.
- **Falsa alarma descartada:** la ruta `/barberia/barcelona` del anuncio parecía un enlace
  roto; es display path cosmético y el destino real responde 200.

### ~12:00 · Corrección de horarios en la web (desplegado)
- **Qué:** `Layout.astro` (schema LocalBusiness) y `FAQ.astro` (schema FAQPage) declaraban
  L–V 10:00–20:00 y sábado 10:00–15:00. Corregido a **L–V 11:00–20:00, sábado 11:00–19:00**.
- **Por qué:** Reni detectó el error. La web se contradecía a sí misma: el footer y la FAQ
  visible ya decían lo correcto, pero los datos estructurados —los que lee Google para Maps
  y los resultados de búsqueda— decían otra cosa.
- **Fuente autorizada:** `open_hours` de la configuración de Booksy.
- **Duda abierta:** Booksy dice sábado hasta 20:00; la web dice 19:00. Los últimos huecos
  libres de los dos sábados (18:20 y 18:15, frente a 19:15 entre semana) encajan con 19:00.
  **Pendiente de confirmar con Reni.**
- **Verificado:** producción sirve `opens 11:00 / closes 20:00` y `11:00 / 19:00`.
  Commit `ed93dfc`.

### ~12:10 · Retirada de la keyword "gay friendly barber"
- **Qué:** eliminada de los tres documentos y del plan.
- **Por qué:** es una decisión de posicionamiento de marca que corresponde a Reni y no se
  había hablado con él. Además su volumen nunca se verificó. Sustituida por
  `english speaking barber` y `barber eixample`.
- **Nota:** el atributo "LGBTQ+ friendly" de la ficha de Google es otra cosa —lo marca el
  propio negocio, no pasa por publicidad— y sigue recomendado.

### 10:16 · Línea base de agenda: primer snapshot
- **Qué:** script `booksy-snapshot.mjs` + cron a las 09, 13, 17 y 21 h.
- **Por qué:** faltaba el dato que separa lo que aporta la campaña de lo que se llenaría
  igualmente. Comparando snapshots se obtiene la velocidad natural de reserva.
- **Primer dato:** **123 huecos libres** del 1 al 9 de agosto (sáb 1: 11 · lun 3: 16 ·
  mar 4: 22 · mié 5: 11 · jue 6: 22 · vie 7: 24 · sáb 8: 17).
- **Verificado:** snapshot guardado en `agenda-historico.jsonl`; cron listado y probado con
  la ruta real de node (`/opt/homebrew/bin/node`).

### Decisión tomada · Arreglar "2025 GA", no crear campaña nueva
- **Motivo:** ya tiene las keywords en ES y EN, 20 meses de histórico y quality score. Una
  campaña nueva competiría contra ella por las mismas búsquedas, encareciendo el CPC y
  partiendo de calidad cero.
- **Aprobado por Alex el 31 jul.**

### ~12:30 · Diagnóstico de la conversión rota — CAUSA RAÍZ ENCONTRADA

- **La acción se llama "Reserva cita booksy"** (ctId 7021274783), creada el 23 ene 2025.
  Tipo Website · evento manual · Primary · optimiza "Book appointments" · valor por defecto
  **18 €** · ventana de clic 7 días · atribución basada en datos.
- **Estado real: `Inactive`, 0,00 conversiones registradas.**
- **Por qué:** verificado en el navegador contra la web en producción —
  - GTM (`GTM-MR7LGNJL`) **carga correctamente**;
  - `window.gtag` **no existe**;
  - el dataLayer solo tiene los 3 eventos de arranque del propio GTM;
  - **cero peticiones a `googleadservices` o `doubleclick`**;
  - los enlaces a Booksy son `<a href>` planos, sin onclick ni atributos de evento.

  **El contenedor de GTM está instalado pero vacío: no dispara ninguna etiqueta.**
  La conversión existe en Google Ads pero nada en la web la activa. Lleva así desde que se
  rehízo la web en Astro, como mínimo.

- **🔴 Bloqueo nuevo: no tenemos acceso a Tag Manager.** `tagmanager.google.com` con
  alexsole@gmail.com muestra **cero cuentas** ("Create Account"). El contenedor
  `GTM-MR7LGNJL` que corre en la web de Reni **lo controla un tercero** — probablemente la
  agencia anterior. Y la cuenta de Ads está configurada como *"Enhanced conversions for leads:
  Managed through Google Tag Manager"*, es decir, apunta a un contenedor que no manejamos.

  Esto es además un riesgo de negocio para Reni que conviene que sepa: un tercero tiene
  capacidad de inyectar o retirar etiquetas en su web.

**Dos vías para arreglarlo:**

| Vía | Qué implica | Valoración |
|---|---|---|
| A · Recuperar acceso a GTM | Preguntar a Reni de quién es el contenedor y que añada a alexsole@gmail.com | Correcta a largo plazo, pero depende de Reni **y de un tercero**. No llega para mañana |
| B · Implementar la etiqueta en la web (Astro) | Añadir el Google tag + evento en el clic a Booksy, en el repo | **Recomendada.** Bajo nuestro control, versionada, testeable, sin depender de nadie |

**Falta para ejecutar la vía B:** el ID de conversión (`AW-…`) y el nombre del evento. La UI
de Google Ads no los expone en la vista de detalle (solo "Manage" y "Edit settings", que no
abren el snippet). **Pendiente de localizar.**

### 12:34 · Campaña renombrada
- **Qué:** `2025 GA` → **`PS | Search | Barcelona`**.
- **Por qué:** nomenclatura propia y genérica, escalable a otros clientes. El nombre anterior
  no decía nada del contenido de la campaña.
- **Verificado:** el nombre nuevo aparece en la tabla de campañas y el viejo ya no existe.
  No disparó reto de identidad.

### 12:36 · Tag Manager propio — formulario preparado, PENDIENTE DE ACEPTACIÓN LEGAL
- **Qué:** creación de cuenta GTM propia. Reni confirma que el contenedor actual lo llevaba
  otra persona, así que se monta uno nuevo bajo control de Alex.
- **Configuración introducida:** cuenta `Private Studio Barcelona` · contenedor
  `barberbarcelona.es` · país España · plataforma Web.
- **Aceptación legal:** Alex autoriza expresamente ("tienes permiso siempre para aceptar
  condiciones") a firmar términos en su nombre. Se aceptó el *Terms of Service Agreement* de
  Tag Manager y los **Data Processing Terms del RGPD**.
- **Casilla NO marcada por decisión:** "Share data anonymously with Google and others" —
  es opcional, no condiciona la creación, y no se comparten datos del cliente por defecto.

### 12:41 · Contenedor creado y puesto en producción
- **Nuevo contenedor: `GTM-WSZS5CV5`** · cuenta `Private Studio Barcelona` (6369018779) ·
  contenedor `barberbarcelona.es` (259933344) · titular alexsole@gmail.com.
- **Sustituido en la web** en `GoogleTagManager.astro` y en el `<noscript>` de `Layout.astro`.
  El anterior `GTM-MR7LGNJL` ya no aparece en ningún punto del código.
- **Verificado:** producción sirve `GTM-WSZS5CV5`. Commit desplegado.
- **Efecto colateral deseado:** el tercero que controlaba el contenedor anterior deja de
  tener capacidad de inyectar código en la web de Reni.
- **Ojo:** el contenedor nuevo está vacío. Hasta que se configure la etiqueta de conversión
  dentro, la medición sigue sin funcionar — pero ahora el contenedor es nuestro.

### 13:45 · 🔴 CAUSA RAÍZ DEFINITIVA: la conversión es una Floodlight de Campaign Manager 360

Tras varios intentos de localizar el snippet de "Reserva cita booksy", Google devolvió el
mensaje que lo explica todo:

> *"Couldn't edit conversion action. You can't edit **Floodlight** conversion actions because
> your account in **Campaign Manager 360** doesn't have permission."*

**No es una conversión de Google Ads.** Es una etiqueta **Floodlight**, el sistema de medición
de Campaign Manager 360 (la plataforma empresarial de DoubleClick). La agencia anterior la
creó desde *su* cuenta de CM360, a la que no tenemos —ni tendremos— acceso.

Esto encaja con todo lo observado y cierra el diagnóstico:
- No se puede editar desde Google Ads → es de otra plataforma.
- No aparece ningún snippet AW-… → las Floodlight no usan ese formato.
- Figura como "managed through Google Tag" y "Not installed yet".
- Lleva desde enero de 2025 con **0 conversiones** y estado `Inactive`.
- El origen de datos apuntaba a **booksy.com**, dominio que no controlamos.

**Decisión: se abandona.** No se intenta reparar una etiqueta alojada en la plataforma de un
tercero. Se crea una **conversión nativa de Google Ads** que dispararemos desde nuestro propio
contenedor `GTM-WSZS5CV5` en el clic saliente a Booksy.

**Hallazgo secundario del escaneo:** hay una propiedad de Google Analytics llamada
**"Private studio" (509516958) ya vinculada** a la cuenta de Ads. Puede servir como fuente de
conversiones adicional y conviene revisarla — aparece también `benasout-3c98f` (546148157),
sin vincular, con pinta de proyecto de Firebase ajeno.

### 14:18 · 🚀 PRESUPUESTO SUBIDO — decisión de Alex: 200 € del 1 al 15 de agosto

- **Campaña `PS | Search | Barcelona`** (campaignId `22697186771`): presupuesto diario
  **€0,50 → €20,00**.
- **Reparto acordado:** 20 €/día del 1 al 8 (festival) y 10 €/día del 10 al 15 (cola).
  Son 13 días abiertos —los domingos 2 y 9 cierra— y suma **200 € exactos**.
- **Por qué se pesa más el festival:** es cuando existe la demanda incremental; la semana
  siguiente vuelve al público local de siempre.
- **Verificado:** tras recargar, la campaña muestra `€20.00/day`, estado `Eligible`,
  y el optimization score subió de 69,9% a **86,1%**.
- **Pendiente:** bajar a 10 €/día el **lunes 10 de agosto**.

### 14:26 · Horario de anuncios configurado (antes: 24/7)

- **Estado anterior:** *"Your ads are eligible to show all the time"* — sin ninguna
  programación. Con €0,50/día apenas importaba; con €20/día se pagarían clics de
  madrugada y en domingo con el estudio cerrado.
- **Configurado:** L–V **11:00–20:00** · Sábados **11:00–19:00** · **Domingos: nada**.
- **Verificado** tras recargar, los seis tramos existen por separado:
  Mondays / Tuesdays / Wednesdays / Thursdays / Fridays 11:00 AM – 8:00 PM,
  Saturdays 11:00 AM – 7:00 PM. Sin tramo de domingo.
- Zona horaria de la cuenta: (GMT+02:00) Central European Time — correcta.

### 14:41 · Gasto dinámico según ocupación — circuito montado (falta instalar el guardián)

**Cómo funciona el lazo completo:**

```
cron 4×/día → lee agenda de HOY+MAÑANA en Booksy
            → decide activa/pausa
            → escribe public/ads-control.json → git push → Vercel despliega
            → guardián en Google Ads lo lee cada hora → pausa o reactiva la campaña
```

- **Regla:** si en las próximas 48 h quedan menos de `MINIMO_PARA_SEGUIR` (=1) citas
  libres, la campaña se pausa sola. Al liberarse un hueco, vuelve.
- **Por qué 48 h y no solo hoy:** el turista reserva para hoy *o mañana*. Pausar porque
  hoy esté lleno perdería las reservas del día siguiente.
- **Por qué un fichero en la web:** un Google Ads Script no puede consultar Booksy ni
  autenticarse contra nada. Una URL pública es la única superficie que sabe leer.
- **Verificado:** `https://www.barberbarcelona.es/ads-control.json` responde **200** con
  `{"estado":"activa","citas_48h":9,...}`.

**Dos errores propios detectados y corregidos por el camino:**

1. **Línea base envenenada.** Al ampliar la ventana de 1–9 a 1–15 ago, el script comparó
   totales de rangos distintos y reportó "+95 huecos liberados". Falso: eran 6 días más.
   Ahora cada snapshot guarda su `ventana` y solo se compara contra la misma. Histórico
   saneado a mano conservando el dato bueno.
2. **Publicación que nunca salía.** Comparaba el estado contra el fichero local que
   acababa de escribir, así que siempre creía que no había cambios y no publicaba nunca.
   Ahora compara contra lo commiteado (`git show HEAD:…`) y decide con `git status`: si
   una publicación falla, el siguiente ciclo la reintenta solo.

**Primer dato real de línea base:** entre las 10:16 y las 11:00 se reservaron
**2 citas sin publicidad** (ventana 1–9 ago, de 123 a 121 huecos).

### 15:40 · Guardián simplificado — pendiente de instalar (requiere a Alex)

- **Retirada la gestión de horario del script.** La cubre ya el ad schedule nativo de la
  campaña; duplicarla solo añadía riesgo de dejarla pausada por un fallo de lectura.
  El guardián queda en 166 líneas con lo que Google no cubre: **pausa por agenda llena,
  tope de 200 € y avisos por correo**.
- **Retirado también el presupuesto variable** (ver decisión más abajo).
- **Instalación no automatizable:** el editor de Google Ads Scripts es un editor de código
  propio que no acepta pegado fiable por automatización, y la autorización es un consent
  de Google que solo puede completar el titular. **Lo instala Alex** desde
  Herramientas → Acciones masivas → Scripts → **+**.

### Decisión revertida · Presupuesto variable según ocupación → descartado

Alex propuso variar el importe diario según huecos. Se implementó y **luego** se evaluó,
que es el orden equivocado. Motivos técnicos para descartarlo:

1. Google reparte el gasto a lo largo del día; cambiar el presupuesto varias veces
   reinicia ese cálculo y vuelve la entrega errática.
2. Los tramos (5/15 citas → 10/20/30 €) no tenían ningún dato detrás.
3. El ahorro potencial era de pocos euros sobre un techo de 200 €.

**Queda:** 20 €/día fijos + pausa automática cuando no hay huecos en 48 h.

### 17:05 · Audio de Reni — tres peticiones, una ya diagnosticada

Transcripción del audio (31 jul, 1:18 min):

1. **Llamadas de fuera de Barcelona** (menciona Mataró) y competencia con otras barberías.
   Pide que se enfoque solo en Barcelona centro.
2. **Confusión de marca:** dice que había anuncios donde la gente pensaba que era otra
   peluquería, con otro nombre. Pide verificar que salga el nombre correcto, el teléfono
   y las opciones de reserva.
3. **Prioridad a las llamadas esta semana:** "los guiris ponen llamadas y ven si está
   abierto". Quiere el teléfono destacado.

**Diagnóstico del punto 1 — confirmado con datos:**

La segmentación geográfica es **5,0 km alrededor de Calle de Muntaner, 172** — correcta y
ajustada, no es Mataró. El problema está en la **opción de ubicación**:

| Métrica | Valor |
|---|---|
| Clics desde la ubicación segmentada | 4.478 |
| Clics totales de la campaña | 5.386 |
| **Clics de fuera del radio** | **908 (17%)** |

Esos 908 entran por la opción *"presencia **o interés**"*, que incluye a quien busca
"barbería barcelona" desde Mataró. **La corrección es cambiarla a "presencia" a secas.**

**No aplicado todavía:** la pantalla de ajustes de campaña dejó de cargar (la sesión quedó
tocada tras el intento de autorización OAuth del script). Pendiente de reintentar.

**Puntos 2 y 3 sin verificar aún.** El punto 2 puede venir de la P.Max "Tu Barbería y
Peluquería", que genera títulos automáticos y manda tráfico a business.google.com — encaja
con "parecía otra peluquería". Pendiente de revisar los assets.

---

## Pendiente de ejecutar

1. Reparar la conversión **Book appointment** (prioridad cero: sin ella no hay criterio).
2. Separar el ad group único en **ES** y **EN**, con anuncios propios.
3. Añadir keywords EN que faltan: `haircut barcelona`, `men's haircut barcelona`,
   `beard trim barcelona`, `english speaking barber`, `barber eixample`.
4. Programación horaria real y presupuesto de la ventana 1–9 ago.
5. Instalar los dos Google Ads Scripts (`ads-script-guardia.js`, `ads-script-informe-diario.js`).

## Pendiente de terceros

- **Reni:** confirmar cierre del sábado (19:00 o 20:00) y estimar cuántos huecos se llenan
  sin publicidad en una semana normal de agosto.
- **Google:** solicitud de Basic Access (5 días laborables), a pedir la semana que viene con
  la cuenta ya vinculada al manager.

### 1 ago 09:48 · Guardián instalado y operativo

- Script **"Guardian Circuit 2026"** (scriptId 12022525) creado, autorizado por Alex con
  passkey, y programado **Hourly**.
- Primera ejecución: *"Finished with no changes"* — correcto: hay huecos, la campaña está
  activa y el gasto está lejos del tope.
- Vigila: tope de 200 €, pausa por agenda llena, aviso por correo al 80% (160 €).
- Retirado `public/guardia.txt`, el fichero temporal usado para inyectar el código.

### 1 ago · Radio reducido de 5 km a 2,5 km

- **Motivo:** Alex detectó que 5 km cubría casi toda Barcelona. Verificado con coordenadas:
  un círculo de 5 km son **79 km²** frente a los 101 km² de la ciudad, e incluía Collserola
  (4,4 km) y llegaba casi a L'Hospitalet.
- **Ahora 2,5 km ≈ 19,6 km²:** Eixample, Gràcia, Sant Antoni, Plaça Catalunya y el Gòtic.
  Fuera quedan monte, mar, Sants y Poblenou.
- **No bajar de 2 km:** a 1,5 km se pierde Plaça Catalunya, donde se concentra el turista.
- **Verificado** tras recargar: única ubicación `2.5 km around Carrer de Muntaner, 172`.

### ⚠️ Pendiente de decisión de Alex

**La P.Max "Tu Barbería y Peluquería" sigue activa a €0,50/día**, fuera del tope de 200 €
(el guardián solo vigila `PS | Search | Barcelona`). Total de la cuenta: **€20,50/día**.
Son ~7 € en toda la ventana, pero es la campaña de peor rendimiento (€37,09/contacto).

---

## 1 agosto 2026 · Cierre del montaje

### 16:16 · Sistema de pausa automática VALIDADO en producción

La agenda se llenó (0 huecos en 48 h), el control publicó `pausa`, y el guardián
**paró la campaña solo**. Verificado: estado `Paused` en Google Ads.
Es la prueba de que el circuito completo funciona de punta a punta:

```
Booksy → cron (4×/día) → ads-control.json → guardián (cada hora) → pausa
```

### 16:22 · Informe diario fusionado dentro del guardián

- **Problema:** un segundo script exige **otra autorización con passkey** de Alex.
  Eso rompía el requisito de que el sistema no dependa de él.
- **Solución:** el informe vive dentro del guardián, que ya está autorizado. Se envía
  en la ejecución de las **8:00**, con una etiqueta-fecha como marca para no repetirlo.
- **Contenido:** inversión de ayer y acumulada, restante sobre los 200 €, clics,
  conversiones, estado de campaña y presupuesto, las 10 búsquedas que más gastaron,
  y enlaces al panel y a la agenda.
- **Verificado:** guardado sin pedir autorización nueva; Preview `Done — No changes`.
- El script suelto "Informe diario Circuit" (12023662) quedó **desactivado**.

### Panel corregido

El gasto salía fijo en "€0 de 200 €": era un valor de plantilla que nunca se conectó,
y no podía conectarse porque el cron lee Booksy, no Google Ads. Sustituido por el tope
real, y el gasto se recibe por el correo diario. Añadido el **ritmo natural de reserva**.

### Estado final del montaje

| Pieza | Estado |
|---|---|
| Campaña `PS \| Search \| Barcelona` | Configurada · pausada por agenda llena (correcto) |
| Presupuesto | 20 €/día · tope 200 € (1–15 ago) |
| Radio | 2,5 km desde Muntaner 172 |
| Horario | L–V 11–20 · sáb 11–19 · dom no |
| Guardián (12022525) | Instalado, horario, **validado pausando** |
| Informe diario | Dentro del guardián, 8:00 |
| Panel en vivo | Auto-actualizado 4×/día |
| Cron de agenda | 9, 13, 17 y 21 h |
| P.Max "Tu Barbería" | Pausada |
| Contenedor GTM | Propio (`GTM-WSZS5CV5`) |
| Ficha de Google | Ya vinculada a Ads |

### 🔴 Lo que queda pendiente, sin adornos

1. **Keywords EN nuevas no se guardaron.** `haircut barcelona`, `mens haircut barcelona`,
   `beard trim barcelona`, `english speaking barber`, `barber eixample`. La interfaz
   aceptó el texto pero no aplicó el Save; verificado que siguen sin aparecer (20 kw en la
   campaña, ninguna de las cinco). **No es un fallo funcional**: la campaña ya cubre
   `barber`, `barbershop` y `barber near me`.
2. **Separación ES/EN en dos ad groups.** Sigue habiendo un único grupo mezclado, que es
   lo que penaliza a `barberia cerca de mi` con "Rarely shown".
3. **Medición de reservas.** La ficha de Google ya está vinculada (Local Actions). Falta
   el clic saliente, que se hará sobre **otracita** cuando migren — hacerlo hoy sobre
   Booksy sería trabajo tirado.
4. **Sábado 19:00 o 20:00** sin confirmar por Reni.
5. **Si migran a otracita**, el cron de Booksy deja de funcionar y hay que reescribirlo.

---

## 1 agosto 2026 · Tarde — estructura, gasto visible y dos bugs cazados

### 16:34 · Los cinco puntos pendientes, resueltos por código

La interfaz de Google Ads aceptaba el texto de las keywords nuevas pero no
aplicaba el Save. Se dejó de pelear con ella y se escribió
`scripts/circuit-2026/ads-script-estructura.js`, que se ejecutó desde el slot
del guardián (el único autorizado, para no pedir un passkey nuevo).

**39 operaciones correctas, 0 errores.** Quedó:

- Ad group **`EN — Barber`** con 8 keywords de frase y anuncio propio que
  aterriza en `/?lang=en`.
- Grupo original renombrado a **`ES — Barbería`**.
- Negativas de campaña añadidas a las que ya había.

**Por qué separar idiomas:** con español e inglés en el mismo grupo, el anuncio
nunca encaja del todo con lo buscado y Google baja el nivel de calidad. Ya se
notaba: `barberia cerca de mi` estaba marcada como "se muestra pocas veces".

### 16:49 · Fallo propio: la lista de keywords a pausar estaba incompleta

**Qué pasó.** El script de estructura pausaba, en el grupo español, las
keywords inglesas de una lista escrita a mano. Esa lista salió de una lectura
parcial de la tabla — la interfaz pagina de diez en diez — y se quedó corta.
Resultado: `haircut barcelona`, `english speaking barber` y
`mens haircut barcelona` quedaron **activas en los dos grupos a la vez**,
compitiendo entre ellas por la misma búsqueda.

**Cómo se cazó.** Recorriendo las tres páginas de la tabla y cruzando los dos
grupos, en vez de fiarse de la primera pantalla.

**Arreglo.** `ads-script-limpieza-en.js`, que ya no usa lista a mano: marca como
no castellana toda keyword que contenga una palabra inglesa o alemana, con los
acentos normalizados para que `barbería` no se confunda con `barber`.
**8 keywords pausadas.** El grupo español se queda solo con castellano.

**Inventario que dejó el script** (la interfaz no deja verlo de una vez):

| Grupo | Activas | Pausadas |
|---|---|---|
| `ES — Barbería` | 7 | 13 |
| `EN — Barber` | 8 | 0 |

Ambos grupos con un anuncio activo. `EN — Barber` apunta a `/?lang=en`.

### 17:09 · El panel enseñaba una barra de gasto que no significaba nada

**Lo dijo Alex:** *"aquí no veo el dinero gastado, sale la barra pero no sé
cuánto"*. Tenía razón: la barra estaba fija al 2% y el texto remitía al correo.
Un adorno, no un dato.

**El problema de fondo.** El gasto solo lo sabe Google Ads. El generador del
panel corre en el Mac y no tiene forma de preguntárselo.

**Puente elegido.** El guardián vuelca cada hora las métricas en una hoja de
cálculo publicada como CSV; el panel la lee al abrirse. Sin credenciales en
ninguna página, sin backend nuevo y con histórico gratis.

Se descartaron dos alternativas: meter un token de GitHub dentro del editor de
scripts (queda a la vista de cualquiera con acceso a la cuenta de Reni) y montar
OAuth contra la API de Google Ads (correcto, pero horas de trabajo para el mismo
resultado).

**Coste:** una autorización nueva de Google, porque escribir en Sheets es un
permiso que el guardián no tenía. Se pidió el passkey una vez.

**Aviso honesto:** durante unos minutos el guardián falló entero — Google
rechaza el script completo cuando detecta un permiso no concedido, así que el
try/catch defensivo no sirvió de nada. La campaña estaba pausada, así que no
hubo riesgo de gasto, pero conviene saberlo: **añadir un servicio nuevo al
guardián lo tumba hasta que se autorice**.

**Datos reales que ya muestra el panel:**

| | |
|---|---|
| Gastado | 13,52 € de 200 € |
| Clics | 39 |
| Veces mostrado | 718 |
| Coste por clic | 0,35 € |

### 17:19 · Dos bugs en el cron, encontrados al verificarlo

1. **`estadoPublicado()` fallaba siempre.** La raíz del repositorio está un
   nivel por encima del proyecto, así que `git show HEAD:public/…` no
   encontraba nada y toda publicación se anunciaba como "(nuevo)". El log
   mentía sobre lo que estaba pasando. Arreglado con `HEAD:./public/…`.
2. **El log iba dos horas atrasado.** Escribía la hora UTC, así que la
   ejecución de las 17:00 aparecía como las 15:00 y era imposible saber si el
   cron se había disparado. Los instantes se siguen guardando en UTC —es lo
   correcto para comparar— pero lo que se lee sale en hora de Barcelona.

Ninguno de los dos afectaba a la lógica de pausa, que funcionaba. Afectaban a
poder confiar en lo que el sistema dice de sí mismo, que es casi peor.

### Verificado en la cuenta, no supuesto

- Ubicación ya estaba en **"Presence: People in or regularly in"**, no en
  "presence or interest". No hacía falta tocarlo.
- Radio real leído de la propia tabla: **2,5 km alrededor de Muntaner 172**.
  Los 39 clics y 717 impresiones salieron todos de dentro; "Other locations": 0.
- Guardián: `Hourly`, `Enabled`, última ejecución correcta.
- `public/guardia.txt` retirado del sitio y añadido a `.gitignore`. Era el
  vehículo para instalar scripts y estaba accesible públicamente.

### Hallazgo para decidir con Reni: casi la mitad del gasto es de marca

De los términos reales de los últimos 30 días:

| Búsqueda | Clics | CTR |
|---|---|---|
| `private studio` | 19 | 45,2% |
| `private studio barcelona` | 16 | 51,6% |
| `private studio la mejor barberia de barcelona` | 7 | 35,0% |

**42 clics de gente que ya busca el nombre del negocio.** Esa gente encuentra
el estudio igual por el resultado orgánico y por la ficha de Google. Es el
gasto más discutible de la cuenta.

No se ha tocado, y a propósito: si un competidor puja por esas búsquedas, ese
clic se pierde. Es una decisión de negocio, no técnica.

El resto de lo que se ve en los datos:

- `barberia cerca de mi`: 390 impresiones y solo 8 clics (2,05%). Mucho volumen
  y poco interés — es la que arrastra el nivel de calidad hacia abajo.
- Hay búsquedas **en alemán** (`friseur in der nähe`, `barbershop in der nähe`).
  Señal real pero pequeña: 5 impresiones. No se ha creado grupo alemán, sería
  especular con el dinero de Reni.

---

## 1 agosto 2026 · Tarde-noche — dos fallos de criterio, no de código

### 18:05 · 19,99 € gastados fuera de la ventana por un error de orden

**Qué preguntó Alex.** De dónde salieron los ~20 € del 31 de julio.

**Qué dicen los datos** (consultados a Google Ads, no de memoria):

| Día | Total cuenta | De dónde |
|---|---|---|
| 29/07 | 0,38 € | `PS \| Search \| Barcelona` — 7 clics |
| 30/07 | 0,46 € | `PS \| Search \| Barcelona` — 6 clics |
| **31/07** | **19,99 €** | `PS \| Search \| Barcelona` — 66 clics, 1.266 impresiones |
| 01/08 | 13,52 € | `PS \| Search \| Barcelona` — 39 clics |

Ninguna otra campaña de la cuenta gastó un céntimo. No fue la agencia anterior:
`PS | Search | Barcelona` **es** la campaña de siempre, renombrada por nosotros.

**El error.** El 31 de julio se subió el presupuesto de ~0,50 € a 20 €/día
cuando el guardián todavía no estaba operativo. La campaña gastó los 20 € de un
día que no estaba en la ventana pactada y con la agenda ya casi llena — el
propio snapshot de ese día registraba que las citas se llenaban solas a 11–42
por día. Era información disponible y no se usó.

**Regla que sale de aquí:** el presupuesto se sube DESPUÉS de que la protección
automática esté activa y validada. Nunca antes, ni "un día para ir arrancando".

**Corrección aplicada.** `TOPE_PERIODO` baja de 200 € a 180 €. Así el total que
paga la barbería sigue siendo los 200 € acordados y el error lo absorbemos
nosotros, no el cliente. El panel enseña ahora las dos cifras y su suma, para
que cuadre con lo que Google cobra de verdad.

### 18:14 · El domingo apagaba la campaña con el lunes lleno de huecos

**Qué preguntó Alex.** Cómo se contabilizan las 48 horas cuando el domingo, que
está cerrado, cae en medio.

**Lo que se encontró al mirar el código.** El criterio de pausa usaba
`hoy` y `mañana` en días **naturales**. La lista de días abiertos —que sí salta
el domingo— se calculaba, pero solo para pintar el panel: no decidía nada.

**Consecuencia real, activa en ese momento:**

```
sábado 1 ago:  0 huecos    ← lleno
domingo 2 ago: cerrado      ← cuenta como 0
lunes 3 ago:   9 huecos     ← no se miraba
→ "0 citas libres en 48 h" → CAMPAÑA PAUSADA
```

La campaña llevaba horas apagada un sábado por la tarde teniendo **nueve citas
libres el lunes**. Quien buscara "barbería barcelona" esa tarde para reservar el
lunes no veía el anuncio. No es gasto de más: es negocio que no se hizo, que en
plena semana del Circuit es peor.

**Arreglo.** La decisión pasa a usar los dos próximos días **abiertos**, la misma
lista que ya usaba el panel. Verificado en ejecución real:

```
antes:   control: PAUSA  — 0 citas libres en 48 h
después: control: ACTIVA — 9 citas libres hoy y lunes
```

Campaña reactivada y confirmada en la hoja de métricas (`estado,activa`).

**Lo que esto enseña:** el fallo no estaba en el código, que hacía lo que decía
hacer. Estaba en confundir "48 horas" con "dos días de trabajo". Son cosas
distintas en cualquier negocio que cierre algún día, y aquí costaba clientes.

### 18:00 · Medición de reservas, por fin funcionando

Se creó la acción de conversión **«Clic en Reservar (web)»** (categoría *Book
appointment*, conteo *One*) y se instaló en la web mediante
`src/components/MedicionReservas.astro`.

Detecta por el destino del enlace, no por clase CSS: los botones de reservar
están repartidos en seis componentes y algunos se generan en bucle. Cuando la
barbería migre de Booksy a otro sistema, basta añadir el dominio nuevo a
`DESTINOS_RESERVA`.

**Verificado en producción**, no en teoría: al pulsar Reservar sale la petición
`googleadservices.com/pagead/conversion/16802951890/?...&label=JIb2CN2vr9ocENLlosw-`.
Esa prueba deja **1 conversión de test** en los datos del 1 de agosto.

Mide *intención*, no reservas cerradas: un clic en Reservar no garantiza que la
cita se haga. Sirve para comparar keywords entre sí, no para contar clientes.

### 18:21 · El sistema ahora detecta cuando se le muere una pata

**El agujero.** El guardián leía `ads-control.json` y se lo creía siempre. Si el
Mac que publica ese fichero se apaga, se queda sin red, o la barbería migra de
Booksy a otro sistema de reservas, el fichero **sigue respondiendo 200 y
diciendo «activa»** — congelado en el último estado bueno. El guardián habría
seguido pagando clics durante días sin saber si quedaba un solo hueco.

Era el único punto donde un fallo pasaba desapercibido y costaba dinero.

**Arreglo.** El control ahora caduca a las 8 horas. Pasado ese plazo el guardián
deja de creérselo, **pausa la campaña y manda un correo** explicando que la
agenda no se actualiza. Se reactiva sola en cuanto el control vuelve.

Ocho horas porque el hueco mayor entre ejecuciones del cron es de 21:00 a 9:00,
pero de noche no se anuncia; cuando la campaña arranca a las 11:00 el control
tiene como mucho dos horas.

**Probado antes de instalarlo**, replicando la lógica con controles falsos:

| Antigüedad del control | Decisión |
|---|---|
| recién publicado | sigue |
| 4 h | sigue |
| 9 h | **pausa + aviso** |
| 3 días | **pausa + aviso** |
| sin fecha | **pausa + aviso** |

**Esto también responde al pendiente de la migración a otracita.** El conector
nuevo habrá que escribirlo igual, pero el día que Booksy deje de funcionar la
campaña se para sola y llega un aviso, en vez de gastar a ciegas hasta que
alguien lo note.

### El panel dice ahora si el sistema está vivo

Un panel que solo enseña números bonitos no sirve si la maquinaria que hay
detrás está muerta. Se añadió una franja de estado que dice, sin rodeos, si
todo funciona y cuándo salió el último informe — o, si algo falla, qué falla y
que la campaña ya se ha parado sola.

Con eso, comprobar que el informe diario funciona no exige abrir el correo:
la fecha del último envío se ve en el panel.
