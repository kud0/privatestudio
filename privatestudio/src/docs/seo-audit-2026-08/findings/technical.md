# Technical SEO Audit — barberbarcelona.es (2026-08-03)

Scope: crawlability, indexability, security, URL structure, mobile, Core Web
Vitals (lab only — no GSC/CrUX/PSI credentials available), structured data
(presence/parse only — detail owned by a separate agent), JS rendering,
IndexNow. Evidence gathered via direct `curl` against production, source
reads in the repo (`/Users/alexsolecarretero/Public/projects/Websites/privatestudio`),
and `claude-seo run` scripts (`sitemap_discovery.py`, `preload_check.py`).

## Technical Score: 74/100

| Category | Status | Score |
|---|---|---|
| Crawlability | pass | 88/100 |
| Indexability | fail | 48/100 |
| Security | warn | 65/100 |
| URL Structure | pass | 90/100 |
| Mobile | warn | 75/100 (partial — see NOT VERIFIED) |
| Core Web Vitals | n/a | no field data; lab signal only (75/100, not comparable to the others) |
| Structured Data | pass | 90/100 (presence/parse only) |
| JS Rendering | pass | 100/100 |
| IndexNow | fail | 0/100 (not implemented) |

Indexability and Security drag the overall score down; everything else is solid.

---

## Critical Issues (fix immediately)

### 1. `/review` is a live, indexable, thin redirect page with no canonical and no robots directive
- **Evidence:** `curl -sI https://www.barberbarcelona.es/review` → `200 OK`. Page source (`src/pages/review.astro:6-15`) has no `<meta name="robots">`, no `<link rel="canonical">`, doesn't extend `src/layouts/Layout.astro` (no viewport meta tag either). It is not listed in `public/sitemap.xml` or `src/docs/seo-audit-2026-08/urls.txt`. `public/robots.txt` is `Allow: /` with no exception, so nothing blocks it. The page's only content is `<meta http-equiv="refresh" content="0;url=https://search.google.com/local/writereview...">` — a client-side meta-refresh, not a real HTTP redirect.
- **Why it matters:** Google can and will crawl and index this URL. It has no unique content, no canonical signal, and uses a technique (instant meta-refresh) that Google treats as a redirect but that isn't cacheable/consolidatable the way a real HTTP redirect is. Today the current state is the worst of both worlds: indexable *and* not a proper redirect.
- **Fix (pick one, both file-only changes):**
  - **Option A — make it a real redirect (recommended):** since `output: "static"` (`astro.config.mjs:7`), add a `vercel.json` at the repo root with:
    ```json
    {
      "redirects": [
        { "source": "/review", "destination": "https://search.google.com/local/writereview?placeid=ChIJSTi2fwCjpBIRs5IMGyNMj9s", "permanent": false }
      ]
    }
    ```
    Then delete `src/pages/review.astro`. `permanent: false` (302) is correct here since the destination is a utility link Alex may repoint later (e.g. if the Place ID changes), not a permanent content move.
  - **Option B — keep it as a page but stop it being indexed:** add `<meta name="robots" content="noindex,follow" />` to `src/pages/review.astro`'s `<head>` and add the viewport meta tag for mobile correctness.
  - This is a product decision (keep as a shareable QR/WhatsApp link vs. hard redirect) — flagging both paths rather than picking one.

### 2. Sitewide hreflang tags point to the homepage on every page, including blog posts
- **Evidence:** `src/layouts/Layout.astro:31-32` hardcodes `href={canonicalDomain + '/'}` for both `hreflang="es"` and `hreflang="en"`. Verified in production on the homepage, `/blog/`, and blog posts of both languages — identical output everywhere:
  ```
  <link rel="alternate" hreflang="es" href="https://www.barberbarcelona.es/">
  <link rel="alternate" hreflang="en" href="https://www.barberbarcelona.es/">
  ```
  checked on: `/`, `/blog/`, `/blog/como-cuidar-barba-en-casa/`, `/blog/how-to-care-for-your-beard-at-home/`.
- **Why it matters:** Blog posts have real ES/EN translation pairs (e.g. `como-cuidar-barba-en-casa` ↔ `how-to-care-for-your-beard-at-home`, per `src/content/blog/*.md` frontmatter `lang: es`/`lang: en`), but the hreflang markup never points to them — it points every page at the homepage instead. This is incorrect hreflang on 100% of pages that carry it, not a partial miss.
- **Fix:** `src/content/config.ts:13` already has `lang: z.enum(['es','en'])` but no field linking a post to its translation counterpart. Add a `translationSlug: z.string().optional()` field to the blog schema, set it on each of the 9 posts (the pairs are visually obvious from titles/slugs), and in `src/layouts/Layout.astro` accept the current page's hreflang pair as props instead of hardcoding `canonicalDomain + '/'`. For the homepage specifically (single URL serving both languages via a client-side toggle, confirmed in the codebase pattern), hreflang tags provide no real signal since there's no separate crawlable URL per language — recommend dropping the hreflang block from the homepage entirely rather than pointing it at itself twice.

---

## High Priority (fix within 1 week)

### 3. `<html lang="es">` is hardcoded regardless of actual page language
- **Evidence:** `src/layouts/Layout.astro:19` — `<html lang="es">` is static markup, not derived from `Astro.props` or `post.data.lang`. Verified in production: `/blog/how-to-care-for-your-beard-at-home/`, `/blog/what-is-visagism-complete-guide/`, and `/blog/mens-haircut-trends-2026/` (all English-language posts per their `lang: en` frontmatter) all render `<html lang="es" ...>`.
- **Why it matters:** the `lang` attribute is a language signal for both search engines and assistive technology (screen readers will announce Spanish pronunciation rules over English text). Combined with finding #2, there's no reliable machine-readable signal anywhere on English posts that the content is English.
- **Fix:** in `src/layouts/Layout.astro`, add an optional `lang` prop to the `Props` interface (default `'es'`), pass `post.data.lang` from `src/pages/blog/[...slug].astro:45` (`<Layout title={...} description={...} lang={post.data.lang}>`), and use it on the `<html>` tag: `<html lang={lang}>`.

### 4. No security headers configured anywhere (no `vercel.json` in the repo)
- **Evidence:** `curl -sI https://www.barberbarcelona.es/` returns only `strict-transport-security: max-age=63072000` — no `content-security-policy`, `x-frame-options`, `x-content-type-options`, `referrer-policy`, or `permissions-policy`. Confirmed no `vercel.json` exists at the repo root (`ls` → "No such file or directory"), so there is no place these are currently being set.
- **Fix:** create `vercel.json` at the repo root:
  ```json
  {
    "headers": [
      {
        "source": "/(.*)",
        "headers": [
          { "key": "X-Content-Type-Options", "value": "nosniff" },
          { "key": "X-Frame-Options", "value": "SAMEORIGIN" },
          { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
          { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains" }
        ]
      }
    ]
  }
  ```
  A full `Content-Security-Policy` is skipped from this suggested config because the site loads Google Tag Manager, Google Ads (`gtag`), and Instagram embed iframes (`src/components/GoogleTagManager.astro`, `src/components/MedicionReservas.astro`, `src/pages/blog/[...slug].astro:94-100`) — a CSP needs to be built and tested against that exact script/frame list to avoid breaking GTM or the Instagram embeds; recommend a follow-up task rather than a copy-paste policy here.

---

## Medium Priority (fix within 1 month)

### 5. `public/sitemap.xml` is hand-written, not generated — will silently drift from content
- **Evidence:** `astro.config.mjs` has no `@astrojs/sitemap` integration (only `tailwind()`), and it's not in `package.json` dependencies. `public/sitemap.xml` is a static file with 11 hardcoded `<url>` entries. Blog posts, by contrast, are auto-routed from `src/content/blog/*.md` via `getStaticPaths()` in `src/pages/blog/[...slug].astro:7-13`. Today the two happen to match (9 posts in `src/content/blog/` = 9 blog URLs in the sitemap), but nothing enforces that.
- **Why it matters:** the next time a blog post is added, it will get a live, crawlable URL automatically but **won't** appear in the sitemap unless someone remembers to hand-edit `public/sitemap.xml`. It'll still get discovered eventually via the `/blog/` index page link, just slower and without the `lastmod`/`priority` signal.
- **Fix:** install `@astrojs/sitemap`, add it to the `integrations` array in `astro.config.mjs`, add `site: 'https://www.barberbarcelona.es'` to the config (required by the integration), and delete the hand-written `public/sitemap.xml` (the integration generates it at build time into the same path).

### 6. IndexNow not implemented
- **Evidence:** grepped the entire repo for "indexnow" — zero matches. Checked `https://www.barberbarcelona.es/.well-known/appspecific/indexnow.txt` and `/indexnow.txt` — both `404`.
- **Why it matters:** Bing, Yandex, and Naver support IndexNow for near-instant re-crawling on publish/update, at zero cost, and it's a natural fit for a static site with infrequent, deliberate deploys (new blog post, price change, etc.).
- **Fix:** generate a key (any GUID), publish it at `public/<key>.txt` (content = the key itself), and after each deploy run `claude-seo run indexnow_submit.py --host www.barberbarcelona.es --key <key> --key-location https://www.barberbarcelona.es/<key>.txt --urls-file src/docs/seo-audit-2026-08/urls.txt`. This is an opportunity to implement, not something broken — no submission was made as part of this audit.

### 7. Apex domain redirects with `307` (temporary) instead of a permanent redirect
- **Evidence:** `curl -sI https://barberbarcelona.es/` → `HTTP/2 307`, `location: https://www.barberbarcelona.es/`. Contrast with `http://` → `https://` which correctly returns `308` (permanent). No `vercel.json` exists, so this redirect is set in Vercel's Project → Domains dashboard, not in the repo — **NOT VERIFIABLE from source**, only from live behavior.
- **Fix:** in the Vercel dashboard, check the apex-domain redirect setting for a "permanent redirect" toggle; if Vercel's domain-level redirect doesn't expose that option, move the redirect into `vercel.json` (`"redirects": [{ "source": "/(.*)", "has": [{ "type": "host", "value": "barberbarcelona.es" }], "destination": "https://www.barberbarcelona.es/$1", "permanent": true }]`) so it's version-controlled and explicitly 308.

---

## Low Priority (backlog)

### 8. Trailing-slash URLs aren't canonicalized via redirect (mitigated by `<link rel="canonical">`, not eliminated)
- **Evidence:** both `https://www.barberbarcelona.es/blog` and `.../blog/` return `200` independently (no redirect either direction); same for the homepage's implicit case. Both variants do carry a correct, matching, self-referencing canonical (`rel="canonical" href="https://www.barberbarcelona.es/blog/"` on both). `astro.config.mjs` has no explicit `trailingSlash` setting, so Astro's default (`"ignore"`) applies.
- **Fix (optional hardening):** set `trailingSlash: "always"` in `astro.config.mjs` and add a redirect rule for the no-slash variant, for full determinism — not urgent since canonical tags already prevent duplicate-content harm.

### 9. HSTS missing `includeSubDomains` (and not preloaded)
- **Evidence:** `strict-transport-security: max-age=63072000` only — no `includeSubDomains`, no `preload`.
- **Fix:** covered by the `vercel.json` header change in finding #4. HSTS preload-list submission is optional and typically reserved for high-security sites; not recommended as a priority here.

---

## Category Detail

### Crawlability — 88/100
- `robots.txt` (`public/robots.txt`): valid, `User-agent: *` / `Allow: /`, correctly declares `Sitemap: https://www.barberbarcelona.es/sitemap.xml`. **Pass.**
- Sitemap: verified via `claude-seo run sitemap_discovery.py https://www.barberbarcelona.es --json` — declared in robots.txt, fetched `200`, valid `urlset`, no stale/unsafe fallback locations found (`sitemap_index.xml`, `sitemap-index.xml`, `wp-sitemap.xml` all correctly `404`, i.e. nothing stale left over from another CMS). **Pass**, see finding #5 for the drift risk.
- Crawl depth: home → `/blog/` → `/blog/<slug>/` = 2 clicks max. **Pass.**
- HTML payload size vs. Googlebot's 2MB fetch cap: homepage raw HTML is 199,156 bytes, a sampled blog post 74,981 bytes — both far under the cap. **Pass.**
- Custom 404: `curl` to a nonexistent path returns a true `404` status (Vercel's default not-found handling, `x-vercel-error: NOT_FOUND`), not a soft-404. **Pass.**
- Two hash-suffixed static HTML files exist in `public/` (`hallazgos-barberias-9f3c21.html`, `panel-76380b752010.html`) and are publicly fetchable (`200`), but both correctly carry `<meta name="robots" content="noindex,nofollow">` in source — not a crawlability/indexability defect (Info only; these look like internal dashboards shared via unlisted URL, outside SEO scope).
- AI crawler directives: `robots.txt` has no AI-specific rules (`GPTBot`, `ClaudeBot`, `Google-Extended`, etc.) — the blanket `Allow: /` applies to them too. This is a strategic choice about AI visibility, not a defect; flagging as Info only per this audit's scope (cross-reference GEO-focused audit for a recommendation).

### Indexability — 48/100
- Canonical tags: self-referencing and consistent, verified on `/`, `/blog` + `/blog/` (both resolve to the same canonical), and two blog posts. **Pass.**
- See Critical #1 (`/review`) and Critical #2 + High #3 (hreflang / `lang` attribute) above — these are the category's core failures.
- No parameter-URL duplication or www/non-www duplicate-content risk found (non-www redirects to www, see finding #7 for the redirect-type nuance). **Pass.**
- Thin content / word-count checks: **out of scope for this pass** — owned by the content-quality agent per the task split.

### Security — 65/100
- HTTPS: enforced sitewide, `http://` → `308` to `https://www`. **Pass.**
- See High #4 (missing security headers) and Low #9 (HSTS completeness).
- Back-button hijacking (`pushState`/`replaceState`, enforced by Google since 2026-06-15): read the two inline scripts present on every page (`src/components/GoogleTagManager.astro`, `src/components/MedicionReservas.astro`) — neither touches browser history. **NOT VERIFIED for the GTM container's own tags** (GTM tag configuration lives in Google's web UI, outside this repo, and wasn't inspected) — recommend a spot-check of the live container if third-party tags have been added there.
- Mixed content: none observed on the pages sampled (all resource references seen were HTTPS). Not exhaustively crawled across every asset on every page — **partially verified**.

### URL Structure — 90/100
- Clean, hyphenated, descriptive URLs; no query strings for content. **Pass.**
- Logical hierarchy (`/`, `/blog/`, `/blog/<slug>/`). **Pass.**
- Longest URL in scope is 74 characters (`/blog/fade-vs-taper-vs-degradado-diferencia/`), well under the 100-char flag threshold. **Pass.**
- No redirect chains found (each redirect observed is a single hop). **Pass.**
- Trailing slash: see Low #8.

### Mobile — 75/100 (partial)
- Viewport meta tag present via `src/layouts/Layout.astro:22` on every real page. **Pass.** Missing on `/review` (rolled into Critical #1's fix).
- Tailwind responsive breakpoints observed in spot-checked component styles (e.g. `@media (max-width: 768px)` in `src/pages/blog/[...slug].astro:218`). **Pass** (spot-check, not exhaustive).
- No full-page interstitials or scroll-hijacking observed in the layout/navbar source reviewed. **Pass** (spot-check).
- Touch target sizing (48×48px) and base font size (16px minimum) — **NOT VERIFIED**. This requires a rendered/visual pass (Lighthouse mobile audit or screenshot-based measurement), which wasn't run as part of this source+HTTP-header audit. Flagging explicitly rather than guessing; hand off to whichever agent runs the visual/Lighthouse pass if a deeper mobile-UX check is wanted.

### Core Web Vitals — no field data available
- **No GSC, CrUX, or PageSpeed Insights credentials configured** (confirmed at the start of this task) — there is no real-user (field) LCP/INP/CLS data to report, and none is invented here.
- Lab-only heuristic via `claude-seo run preload_check.py https://www.barberbarcelona.es/ --json`: score **75/100 (lab)**. `fetchpriority="high"` already set on the LCP candidate resource (1 found) — good existing practice. No Speculation Rules API usage (an opportunity: `<script type="speculationrules">` for prefetch/prerender on top user paths, not a defect). No bfcache blockers detected (no `cache-control: no-store` forcing, no `unload`/`beforeunload` listeners).
- No actual LCP/INP/CLS millisecond values or Lighthouse performance score were measured — **NOT VERIFIED**, don't treat the 75/100 preload-signal score as a CWV score; it measures resource-hint hygiene only.

### Structured Data — 90/100 (presence/parse only; full schema.org validation owned by a separate agent)
- 3 valid JSON-LD blocks confirmed sitewide via automated JSON parse of live HTML: `BarberShop` + `WebSite` on every page (emitted from the shared `src/layouts/Layout.astro:58-124`), plus `FAQPage` additionally on the homepage and `Article` additionally on each blog post (`src/pages/blog/[...slug].astro:18-40`). All blocks parsed as valid JSON with no syntax errors, checked on the homepage and one sampled blog post. **Pass** for presence/parseability — property-level schema.org compliance (required/recommended fields, rich-result eligibility) is intentionally left to the dedicated schema agent per this audit's task split.

### JS Rendering — 100/100
- `output: "static"` (`astro.config.mjs:7`) — the entire site is prerendered HTML. Verified primary content (address text, 10 occurrences of "booksy" booking links) is present in the raw `curl` fetch with zero JS execution. **Pass**, no CSR/SPA indexing risk.
- The only inline scripts present (GTM loader, Google Ads `gtag`) don't gate any visible content — they fire after paint. **Pass.**

### IndexNow — 0/100
- Not implemented — see Medium #6. No existing key file, no repo code, no mentions anywhere in the codebase.
