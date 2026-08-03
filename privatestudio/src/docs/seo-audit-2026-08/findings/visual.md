# Visual / mobile rendering audit — barberbarcelona.es

Capturado: home (`/`), blog index (`/blog/`), post (`/blog/que-es-visagismo-guia-completa/`).
Viewports: mobile 375×812 @2x DPR, desktop 1920×1080. Screenshots en `src/docs/seo-audit-2026-08/screenshots/{home,blog-index,blog-post}/`.

## Resumen de la pregunta clave: ¿se puede reservar sin fricción?

- **Home / mobile: sí, 0 scrolls.** El Hero (`src/components/Hero.astro:75-83`) monta una barra "RESERVAR AHORA" `fixed bottom-0`, ancho completo, visible desde el primer frame — ver `home_mobile_viewport.png`. Altura real: `py-5` (20px arriba/abajo) + line-height de `text-xs` (16px) ≈ **56px de alto × 375px de ancho** → tap target excelente, muy por encima del mínimo de 48px.
- **Blog (index y posts) / mobile: sin CTA persistente.** El componente `Hero` solo se importa en `src/pages/index.astro:16`; el layout de post (`src/pages/blog/[...slug].astro`) y el índice no incluyen ninguna barra fija. En esas páginas el único CTA reachable sin scroll es el botón "Reservar" del header (pequeño, ver hallazgo de tap targets) — el otro CTA es un bloque estático al final del artículo (`[...slug].astro:113-120`), que exige leer/scrollear todo el post. Ver `blog_post_mobile_viewport.png`.

## Hallazgos

### 1. [CRÍTICO] El body del Hero se solapa con el H1 en desktop, según qué titular esté rotando
**Evidencia:** `home_desktop_viewport.png` — el párrafo "Un sistema de asesoría masculina basado en tipo de rostro, estilo de vida y percepción de poder." queda escrito encima de la última línea del H1 ("TE FAVORECE?").

**Causa (verificada en código):** `src/components/Hero.astro:129` reserva `min-height: clamp(9rem, 16vw, 15rem)` para el contenedor `#hero-headlines`, que aloja 3 variantes de H1 posicionadas `absolute` (fuera del flujo, rotan cada 7s vía `setInterval` en el `<script>` del mismo fichero). El cálculo de esa altura mínima asume ~4 líneas por variante, pero la variante 2 ("¿CANSADO DE PEDIR / 'LO MISMO' / SIN SABER SI / TE FAVORECE?", `Hero.astro:135-137`) es más larga en caracteres y, al tamaño `font-size: clamp(2.2rem, 3.5vw, 4rem)` dentro de un contenedor `max-width: 560px` (`Hero.astro:126`), su primera línea ("¿CANSADO DE PEDIR") envuelve a una línea adicional — 5 líneas reales contra las ~4 que el `min-height` reservó. El bloque de body (`Hero.astro:145-150`) va justo debajo en flujo normal, así que cuando esa variante está activa, invade el espacio del H1.

Es intermitente (solo se ve con la variante 2, ~1 de cada 3 rotaciones, cada 21s aprox.) pero reproducible y afecta al hero de la home en desktop, el primer elemento que ve cualquier visitante.

**Fix:** en `src/components/Hero.astro`, aumentar el `min-height` del contenedor `#hero-headlines` (línea ~129) a un valor que cubra 5 líneas al tamaño máximo de fuente, o forzar `white-space`/ajustar `max-width` para que ninguna variante envuelva a más líneas que las demás.

### 2. [ALTO] Tap targets del header móvil por debajo de 48×48px (mínimo recomendado Google/WCAG)
Medido desde las clases Tailwind reales (`tailwind.config.mjs` no sobreescribe `spacing`/`fontSize`, así que la escala por defecto de 4px/unidad aplica sin ambigüedad):

| Elemento | Fichero | Clases | Tamaño real |
|---|---|---|---|
| Botón llamar (header móvil) | `src/components/Navbar.astro:26-34` | `p-2` + icono `w-5 h-5` | **36×36px** |
| Botón "Reservar" (header móvil) | `src/components/Navbar.astro:35-41` | `px-4 py-2` + `text-sm` (line-height 20px) | **~36px de alto** (ancho generoso, sin problema) |
| Botón hamburguesa | `src/components/Navbar.astro:42-46` | `p-2` + icono `w-6 h-6` | **40×40px** |
| Botón mute del vídeo hero | `src/components/Hero.astro:26-38` | `w-9 h-9` explícito | **36×36px** |

Los 4 están por debajo de los 48×48px recomendados (los de 36px también quedan por debajo de los 44×44px de Apple HIG). El espaciado entre ellos (`gap-3` = 12px, `Navbar.astro:25`) es correcto, así que no hay riesgo de mistap por proximidad — el problema es solo el tamaño individual del área táctil.

Nota: intenté validar esto también con Lighthouse (`pagespeed_check.py`, auditoría `tap-targets`) para tener una segunda fuente, pero la API de PSI devolvió `"PSI rate limit exceeded"` en ambos intentos (probablemente por uso concurrente de otros agentes en esta sesión) — la medición de arriba está confirmada por álgebra directa sobre clases Tailwind sin overrides, no por Lighthouse.

**Contraste — lo que SÍ pasa el mínimo:** botón cerrar del menú móvil (`Navbar.astro:77`, `p-2` + `w-8 h-8` = **48×48px exacto**, justo en el límite) y los toggles del FAQ (`src/components/FAQ.astro:51-52`, `py-6` full-width ≈ 72-80px de alto) — sin problema.

**Fix:** subir `p-2`→`p-3` (o `w-9 h-9`→`w-12 h-12`) en los 4 elementos de la tabla en `Navbar.astro` y `Hero.astro`.

### 3. [MEDIO] Sin CTA de reserva persistente en `/blog/` ni en los posts (mobile)
Ver resumen arriba. El header sí lleva el botón "Reservar" en todas las páginas (`Navbar.astro` es global), pero es el tap target de 36px de alto del hallazgo #2 — no hay barra fija equivalente a la de la home. Dado que gran parte del tráfico orgánico de blog aterriza directo en el post (no en home), estos visitantes tienen más fricción para reservar que los que entran por home.

**Fix sugerido:** extraer el bloque `<div id="mobile-cta">` de `Hero.astro:75-83` a un componente reutilizable (o incluirlo condicionalmente) y montarlo también en `src/layouts/Layout.astro` o en `src/pages/blog/[...slug].astro` / `blog/index.astro` para mobile.

### 4. [BAJO] Overflow horizontal residual, enmascarado por `overflow-x: clip`
**Evidencia:** las capturas full-page en mobile miden más ancho del esperado (comparado con el viewport-only, que sí da los 750px físicos correctos):
- `home_mobile_full.png` y `blog_index_mobile_full.png`: **766px** (medido con `sips -g pixelWidth`) → ~8px CSS de más.
- `blog_post_mobile_full.png` (post con Instagram embed): **776px** → ~13px CSS de más.

`claude-seo run analyze_visual.py` (que mide `document.documentElement.scrollWidth` justo tras cargar, sin forzar full-page) devuelve `horizontal_scroll: false` en las 3 páginas — no hay barra de scroll visible ni el usuario puede desplazarse lateralmente. Esto es consistente con `src/layouts/Layout.astro:142` (`overflow-x: clip` en `html, body`): hay contenido más ancho que el viewport en algún punto del documento, pero `clip` lo recorta visualmente sin generar scrollbar. No es un bug visible para el usuario hoy, pero es una tirita sobre una causa no resuelta.

Candidato más probable en el post: `.ig-embed` (`src/pages/blog/[...slug].astro:189-225`), el embed de Instagram — en mobile el CSS lo fuerza a `width: 100%; max-width: 340px` (dentro del viewport), pero el `<iframe>` que inyecta el script de Instagram es de terceros y puede imponer su propio ancho mínimo. Esto explicaría por qué el post (que tiene `post.data.instagram` seteado, visible en pantalla como "VER EN INSTAGRAM") mide más overflow que home/blog-index, que no tienen ese embed.

**Fix sugerido:** no es urgente (no rompe la experiencia), pero vale la pena localizar el elemento exacto con DevTools (`document.querySelectorAll('*')` + comparar `getBoundingClientRect().right` contra `innerWidth`) y decidir si se corrige en origen o se documenta como intencional.

### 5. [BAJO] Contraste insuficiente en `<em>` dentro del contenido de blog
`src/pages/blog/[...slug].astro`, bloque `.blog-content :global(em) { color: #6b7280; }` sobre fondo negro (`bg-black` en `article`, `[...slug].astro:48`). Contraste calculado (fórmula WCAG): **4.35:1**, por debajo del mínimo de 4.5:1 para texto normal (18px, no bold — no califica como "texto grande"). El resto del contenido (`p` en `#9ca3af`, gray-400) sí pasa con holgura (8.27:1).

**Fix:** aclarar a `#9ca3af` (gray-400) o similar para las cursivas.

### 6. [RESUELTO] El bug de `layout_issue.png` / `layout_issue_2.png` no se reproduce hoy
Esas capturas antiguas (raíz del repo, sección "Servicios" en desktop) no tenían etiqueta de qué fallaba exactamente, pero al re-capturar la sección en vivo — `home_services_desktop.png` y `home_services_mobile.png` — las filas de servicio (nombre / precio / duración / botón "+") renderizan limpias, sin solapes con el sidebar de categorías ni con el botón "+". El historial de commits (`034a943 fix: mobile CTA fixed with visualViewport iOS fix; restore services`) confirma que hubo una restauración de esta sección después de esas capturas. No requiere acción adicional salvo confirmar con el equipo qué se consideró "roto" originalmente, por si hay un caso puntual no cubierto por mis capturas.

## Lo que funciona bien (verificado)
- CTA de reserva de la home visible sin scroll en mobile y con tap target grande (`home_mobile_viewport.png`).
- Meta viewport presente, tipografía base 16px en las 3 páginas (`analyze_visual.py`).
- H1 visible sin scroll en mobile y desktop en las 3 páginas (confirmado visualmente en las capturas, no solo por heurística de script).
- Botón cerrar del menú móvil (48×48px) y toggles de FAQ (72-80px de alto) cumplen el mínimo de tap target.
- Nav de categorías de "Servicios" en mobile usa `overflow-x-auto` con máscara de degradado como affordance de scroll — diseño intencional, no bug (`Services.astro:163`, `.mobile-nav-mask`).
