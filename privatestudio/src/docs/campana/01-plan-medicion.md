# Plan de Medición — Private Studio × OtraCita

**Versión:** 1.0 · 30 de julio de 2026
**Alcance:** barberbarcelona.es (Astro) + plataforma de reserva OtraCita
**Contenedor GTM actual:** `GTM-MR7LGNJL` (ya instalado en `src/layouts/Layout.astro`)

Este documento es la parte técnica del plan. Sin esto implementado, **no se lanza ninguna campaña**: Google y Meta optimizarían a ciegas y el dinero se pierde en la fase de aprendizaje.

---

## 1. Arquitectura de medición

```
barberbarcelona.es (Astro)
        │  dataLayer.push(...)
        ▼
   GTM (GTM-MR7LGNJL)
        ├──> GA4 (analítica y audiencias)
        ├──> Google Ads (conversiones + remarketing)
        └──> Meta Pixel (navegador)
                    │
reservas.barberbarcelona.es (OtraCita)
        ├──> mismos tags (mismo dominio = misma cookie)
        └──> servidor OtraCita
                 ├──> Meta Conversions API (CAPI)   ─┐ deduplicado
                 └──> Google Ads Enhanced Conversions │ por event_id
                       + conversiones offline (asistencia real)
```

### Decisión crítica: subdominio, no dominio aparte

| Opción | Consecuencia |
|---|---|
| ✅ `reservas.barberbarcelona.es` | Mismo sitio a efectos de cookies. Atribución continua sin configuración extra. Es la opción recomendada. |
| ⚠️ `otracita.es/private-studio` | Requiere medición entre dominios en GA4, `linker` de Google Ads, y en Safari (ITP) se pierde parte de la atribución igualmente. |

Si el negocio de OtraCita exige que el dominio visible sea `otracita.es`, se puede resolver con un CNAME por cliente (`reservas.barberbarcelona.es` → infraestructura de OtraCita). **Es la arquitectura que recomiendo también como estándar de producto de OtraCita**: cada cliente reserva bajo su propio dominio, y eso es un argumento comercial fuerte frente a Booksy, donde la reserva siempre ocurre en dominio ajeno.

---

## 2. Consentimiento (bloqueante legal y técnico)

España/UE: hace falta un CMP con **Consent Mode v2** de Google. No es opcional:

- Sin Consent Mode v2, Google Ads deja de poder usar los datos para audiencias y remarketing en el EEE.
- Meta requiere base legal para el píxel; sin banner, riesgo de sanción RGPD/LSSI.

Requisitos mínimos:
- Banner con **rechazar** tan visible como aceptar (no vale solo "aceptar").
- Estado por defecto: `denied` para `ad_storage`, `ad_user_data`, `ad_personalization`, `analytics_storage`.
- Enviar `consent update` a GTM cuando el usuario decide.
- Página de política de cookies y privacidad enlazada en el footer.

Opciones: Cookiebot, Iubenda, Complianz o CMP propio (viable: es un banner + `gtag('consent', ...)`, y siendo un proyecto propio conviene tenerlo bajo control).

---

## 3. Capa de datos (`dataLayer`) en la web

Convención: `snake_case`, un evento por interacción con intención comercial.

| Evento | Cuándo se dispara | Parámetros |
|---|---|---|
| `view_service` | Se abre el drawer de un servicio (`Services.astro`) | `service_id`, `service_name`, `price`, `duration` |
| `click_book` | Cualquier CTA de reserva (hero, navbar, drawer, blog, FAQ) | `location` (`hero`\|`navbar`\|`drawer`\|`blog`\|`popup`), `service_id?` |
| `view_membership` | Sección de membresías visible ≥ 50 % | — |
| `select_membership` | Clic en una opción de pack | `plan` (`cortes`\|`mix`\|`presidencial`), `sessions`, `price` |
| `click_call` | Clic en `tel:` | `location` |
| `click_whatsapp` | Clic en enlace de WhatsApp | `location` |
| `click_directions` | Clic en "Cómo llegar" / mapa | — |
| `click_review` | Clic en "Opinar en Google" | — |
| `blog_read` | 75 % de scroll en un artículo | `post_slug`, `lang` |
| `language_switch` | Cambio ES↔EN | `to_lang` |
| `popup_shown` / `popup_cta` | Popup de membresías | — |

### Implementación en el código actual

Un único script de delegación en `Layout.astro` cubre casi todo, sin tocar cada componente:

```html
<script is:inline>
  window.dataLayer = window.dataLayer || [];
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a, button');
    if (!a) return;
    const href = a.getAttribute('href') || '';
    const push = (event, params) => window.dataLayer.push({ event, ...params });

    if (href.includes('booksy.com') || href.includes('reservas.barberbarcelona.es')) {
      push('click_book', { location: a.dataset.trackLocation || 'unknown' });
    } else if (href.startsWith('tel:')) {
      push('click_call', { location: a.dataset.trackLocation || 'unknown' });
    } else if (href.includes('wa.me') || href.includes('api.whatsapp.com')) {
      push('click_whatsapp', { location: a.dataset.trackLocation || 'unknown' });
    } else if (href.includes('maps.app.goo.gl') || href.includes('google.com/maps')) {
      push('click_directions', {});
    }
  }, true);
</script>
```

Y se añade `data-track-location="hero"` (o `navbar`, `drawer`, `blog`…) a cada CTA existente. El drawer de `Services.astro` ya tiene el precio y la duración en `data-price` / `data-duration`, así que `view_service` sale casi gratis dentro del `serviceRows.forEach` que ya existe.

---

## 4. Eventos en OtraCita (los que de verdad importan)

| Evento | Momento | Parámetros | Meta | GA4 / Ads |
|---|---|---|---|---|
| `booking_view` | Se abre el calendario | `service_id` | `ViewContent` | `view_item` |
| `booking_started` | Elige servicio + hora | `service_id`, `value`, `currency` | `InitiateCheckout` | `begin_checkout` |
| `booking_completed` | Cita confirmada | `booking_id`, `service_id`, `value`, `currency`, `is_new_customer` | `Purchase` | **Conversión principal** |
| `membership_purchased` | Compra de pack | `plan`, `sessions`, `value` | `Purchase` | **Conversión principal** |
| `booking_cancelled` | Cancelación | `booking_id` | — | (para ajustar valor) |
| `appointment_attended` | Marcado en caja tras el servicio | `booking_id`, `real_value`, `gclid`, `fbclid` | CAPI offline | **Conversión offline** |

`value` siempre en euros y con el precio real del servicio (20,00 / 25,00 / 28,00 / 36,00 / 65,75 / 122,05…). Esto permite pujar por valor en fase 3, que es donde se gana dinero de verdad.

### Deduplicación navegador ↔ servidor

Cada conversión se envía **dos veces**: desde el navegador (píxel) y desde el servidor (CAPI). Para que no se cuente doble, ambas llevan el mismo identificador:

```js
// mismo event_id en pixel y CAPI
const eventId = `booking_${bookingId}`;
fbq('track', 'Purchase', { value: 25.00, currency: 'EUR' }, { eventID: eventId });
// servidor -> CAPI: { event_name: 'Purchase', event_id: eventId, ... }
```

Meta descarta el duplicado automáticamente y se queda con el que llegue con mejor calidad. El resultado es un `Event Match Quality` alto y conversiones que sobreviven a bloqueadores, iOS y navegación privada — exactamente lo que Booksy no puede darte.

---

## 5. Captura y persistencia de `gclid` / `fbclid` (la pieza que casi nadie implementa)

Sin esto no hay conversiones offline, y sin conversiones offline la campaña optimiza a "gente que rellena formularios", no a "gente que se sienta en la silla".

1. Al aterrizar en la web, guardar en cookie propia (90 días): `gclid`, `wbraid`, `gbraid`, `fbclid`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`.
2. Al confirmar la reserva en OtraCita, **guardar esos valores junto al registro de la reserva** en base de datos.
3. Cuando el cliente aparece (o no) a la cita, subir a Google Ads la conversión offline con su `gclid` y el importe real cobrado; y a Meta el evento CAPI correspondiente.
4. **Enhanced Conversions:** enviar email y teléfono hasheados (SHA-256) con la conversión. Recupera entre un 5 % y un 15 % de conversiones que de otro modo se pierden.

> Esto es una funcionalidad de producto de OtraCita, no un parche para Private Studio. Si OtraCita guarda de serie el `gclid` de cada reserva y expone la exportación de conversiones offline, es una ventaja competitiva vendible frente a Booksy y Treatwell.

---

## 6. Configuración de conversiones

### Google Ads

| Conversión | Tipo | Valor | Recuento |
|---|---|---|---|
| Reserva completada | Principal | Dinámico (precio del servicio) | Una |
| Membresía comprada | Principal | Dinámico | Una |
| Cita atendida (offline) | Principal (fase 3) | Importe real | Una |
| Llamada > 30 s | Secundaria | 5 € estimado | Una |
| Clic en WhatsApp | Secundaria | 3 € estimado | Una |
| Cómo llegar | Secundaria | Sin valor | Una |

Ventana de conversión: 30 días clic, 1 día visualización. Modelo de atribución: basada en datos.
**Solo las principales entran en la puja.** Las secundarias se observan, no se optimizan — si no, la campaña acaba comprando clics en el mapa.

### GA4

- Marcar como conversión: `booking_completed`, `membership_purchased`, `click_call`, `click_whatsapp`.
- Audiencias para remarketing: *Visitantes 30 d sin reserva*, *Inició reserva sin completar 7 d*, *Vio membresías sin comprar 30 d*, *Lectores de blog 60 d*, *Clientes (compraron) 180 d* (para excluir de captación y usar como semilla de lookalike).
- Vincular GA4 ↔ Google Ads ↔ Google Business Profile ↔ Search Console.

### Meta

- Verificar el dominio `barberbarcelona.es` en Business Manager (obligatorio para Aggregated Event Measurement).
- Configurar los 8 eventos priorizados de AEM en este orden: `Purchase` → `InitiateCheckout` → `AddToCart` (membresía) → `ViewContent` → `Contact` → `Lead` → `PageView` → `Search`.
- Activar CAPI + comprobar `Event Match Quality` ≥ 6/10.

---

## 7. Convención de UTMs (obligatoria y sin excepciones)

```
utm_source   = google | meta | instagram | newsletter | qr | whatsapp
utm_medium   = cpc | paid_social | email | offline
utm_campaign = ps_2609_visagismo_es        (negocio_añomes_ángulo_idioma)
utm_content  = reel_transformacion_v2      (creatividad concreta)
utm_term     = {keyword}                   (solo Search, con ValueTrack)
```

Ejemplos reales:
- `?utm_source=google&utm_medium=cpc&utm_campaign=ps_2609_barberia_eixample_es&utm_term={keyword}&gclid={gclid}`
- `?utm_source=meta&utm_medium=paid_social&utm_campaign=ps_2609_ritual_es&utm_content=reel_presidencial_v1`

Activar el **etiquetado automático (auto-tagging)** en Google Ads y los **parámetros de URL dinámicos** en Meta. Un `utm_campaign` mal puesto durante dos semanas equivale a dos semanas de datos inservibles.

---

## 8. Orden de implementación

**Bloque 1 — antes de gastar un euro**
1. CMP + Consent Mode v2
2. Meta Pixel + GA4 + Google Ads en GTM
3. `dataLayer` de la web (delegación de clics + `view_service`)
4. Evento `booking_completed` en OtraCita + página `/gracias`
5. Conversión principal creada y verificada en Google Ads y Meta

**Bloque 2 — durante el piloto de agosto**
6. Captura y persistencia de `gclid`/`fbclid` en la reserva
7. Meta CAPI con deduplicación por `event_id`
8. Audiencias de remarketing pobladas
9. Enhanced Conversions con email/teléfono hasheados

**Bloque 3 — antes de escalar en septiembre**
10. Conversiones offline (cita atendida + importe real)
11. Panel de Looker Studio: gasto, CPA, reservas, ingresos y repetición en una sola vista
12. Alertas automáticas: gasto anómalo, conversiones a cero durante 24 h (esto último salva campañas cuando un despliegue rompe un tag)

---

## 9. Verificación antes del lanzamiento

- [ ] Google Tag Assistant: todas las etiquetas disparan y ninguna duplica
- [ ] Meta Pixel Helper: sin errores, `Purchase` con valor y moneda correctos
- [ ] Prueba de eventos de Meta: navegador y CAPI se deduplican (no aparecen dos `Purchase`)
- [ ] GA4 DebugView: recorrido completo desde anuncio hasta `/gracias`
- [ ] Reserva de prueba real de punta a punta con `?gclid=test123` y verificar que llega a la base de datos
- [ ] Consentimiento denegado → comprobar que **no** se lanzan cookies de publicidad
- [ ] Comprobación en móvil, que es donde ocurrirá el 70-80 % del tráfico
