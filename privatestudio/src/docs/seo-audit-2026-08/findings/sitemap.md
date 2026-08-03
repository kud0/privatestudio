# Sitemap Audit — barberbarcelona.es (2026-08-03)

## Score: 60/100

## Evidence base
- `public/sitemap.xml` (11 URLs) — read in full
- `public/robots.txt` — read in full
- `astro.config.mjs`, `package.json` — read in full
- `src/pages/**` (`index.astro`, `blog/index.astro`, `blog/[...slug].astro`, `review.astro`) and `src/content/blog/*.md` (9 files) — enumerated via `find`
- `git log -- public/sitemap.xml` → last commit `3389c7f`, dated 2026-03-19
- Official Astro docs (`docs.astro.build/en/guides/integrations-guide/sitemap/`) fetched to verify `@astrojs/sitemap` output filenames and config options before affirming them below
- All 11 sitemap URLs confirmed 200 by team-lead (`src/docs/seo-audit-2026-08/urls.txt`)

---

## Findings

### 1. [MEDIUM] Sitemap is hand-written, not generated — will silently drift
**Evidence:** `package.json` has no `@astrojs/sitemap` dependency. `astro.config.mjs` has no sitemap integration. `public/sitemap.xml` is a static file in `public/`, copied byte-for-byte to the build output.

Right now coverage happens to be correct — see Finding 4 — but there is zero mechanism enforcing that. The moment a 10th blog post is added to `src/content/blog/`, it will render live and get indexed by internal links/Google crawling regardless, but the sitemap won't know it exists until someone remembers to hand-edit `sitemap.xml`.

**Fix:** migrate to `@astrojs/sitemap` (diff below). For an 11-URL static Astro site this is a strict upgrade with no downside — it regenerates correctly on every `astro build`.

### 2. [MEDIUM] `lastmod` values are already fictional, not just stale
**Evidence:** `git log` shows `public/sitemap.xml` was itself last edited on **2026-03-19** (commit `3389c7f`), but the `<lastmod>` values inside it are dated **2026-02-10 to 2026-02-17** — earlier than the file's own last edit. Today is 2026-08-03, so relative to now they're ~5.5 months stale, but the more important problem is they were never accurate to begin with: they read like placeholder dates typed once and never touched again, not real modification timestamps.

This matters because Google has stated it uses `lastmod` as a freshness/recrawl signal *only* when it's verifiably accurate — a sitemap with untrustworthy dates gets `lastmod` ignored sitewide, which is the worst outcome (you lose the signal even where it would've been true).

**Fix:** `@astrojs/sitemap` doesn't auto-populate `lastmod` from file mtime by default — it can be omitted entirely (Google treats a missing `lastmod` as neutral, not negative), or set via `serialize()` using each content collection entry's frontmatter date if the blog schema has one. Given this is hand-authored content updated infrequently, the simplest correct move is to **not emit `lastmod` at all** rather than guess again.

### 3. [LOW] `changefreq` and `priority` are dead weight
**Evidence:** every URL carries a `changefreq` (weekly/monthly) and `priority` (1.0/0.8/0.7) value. Google has publicly confirmed for years (Search Central docs, John Mueller repeatedly on record) that both fields are ignored for crawling and ranking decisions — they're a leftover from the original 2005 sitemap protocol, before Google had its own recrawl-scheduling logic.

This isn't hurting anything — it's not a violation — but it's manual upkeep (someone has to decide "is this monthly or weekly?") that buys literally nothing. Not worth carrying into the new generated sitemap.

**Fix:** don't configure `changefreq`/`priority` in the `@astrojs/sitemap` integration (they default to omitted unless you explicitly set them).

### 4. [INFO — not a bug] URL coverage currently matches real pages exactly
**Evidence:** 11 sitemap URLs = `/` + `/blog/` + 9 posts (`src/content/blog/*.md`, verified 9 files). The 4th real page, `src/pages/review.astro`, is **correctly excluded** — it's not content, it's a client-facing redirect utility (`<meta http-equiv="refresh">` to the Google "write a review" deep link, meant for WhatsApp/QR/business-card sharing, not discovery). It's not linked from any nav/component (`grep` across `src/layouts`, `src/components` found no internal link to `/review`).

No action needed here today. Flagging only so the `/review` exclusion is preserved deliberately (via `filter()`, see below) rather than accidentally lost when moving off the hand-written file.

### 5. [BLOCKER for migration] `astro.config.mjs` has no `site` set
**Evidence:** verified against Astro's own docs — `@astrojs/sitemap` **requires** `site` to be configured in `astro.config.mjs`; without it the integration throws/no-ops. Current config has no `site` key. Layout.astro hardcodes the canonical domain (`src/layouts/Layout.astro:12`, `canonicalDomain = 'https://www.barberbarcelona.es'`), so the correct value to use is unambiguous.

### 6. [MEDIUM] Filename collision risk on migration — must remove the old static file and update robots.txt
**Verified via Astro docs:** `@astrojs/sitemap` outputs `sitemap-index.xml` (the index) + `sitemap-0.xml` (the actual URL list) — **not** `sitemap.xml`. Astro copies everything under `public/` verbatim to the build root. That means:

- The generated files (`sitemap-index.xml`, `sitemap-0.xml`) and the hand-written `public/sitemap.xml` **do not overwrite each other** — both would ship to production if `public/sitemap.xml` isn't deleted, leaving a permanently stale, orphaned file at `/sitemap.xml` that nothing points to but that a crawler could still find.
- `robots.txt` currently points at `/sitemap.xml` (the old file), which after migration would keep pointing Google at the stale hand-written one instead of the new generated index.

**Fix:** delete `public/sitemap.xml` and update `robots.txt`'s `Sitemap:` line to `/sitemap-index.xml` in the same change.

---

## Migration to `@astrojs/sitemap` — concrete diff

**1. Install:**
```bash
npm install @astrojs/sitemap
```

**2. `astro.config.mjs`:**
```diff
 // @ts-check
 import { defineConfig } from "astro/config";
 import tailwind from "@astrojs/tailwind";
+import sitemap from "@astrojs/sitemap";
+
 // https://astro.build/config
 export default defineConfig({
-  integrations: [tailwind()],
+  site: "https://www.barberbarcelona.es",
+  integrations: [
+    tailwind(),
+    sitemap({
+      filter: (page) => !page.endsWith("/review/"),
+    }),
+  ],
   output: "static",
 });
```
(`filter` receives the full URL, e.g. `https://www.barberbarcelona.es/review/`; `endsWith("/review/")` is precise and won't accidentally match a future blog post whose slug happens to contain "review".)

**3. `public/robots.txt`:**
```diff
 User-agent: *
 Allow: /
-Sitemap: https://www.barberbarcelona.es/sitemap.xml
+Sitemap: https://www.barberbarcelona.es/sitemap-index.xml
```

**4. Remove the hand-written file (after confirming the build output looks right):**
```bash
rm public/sitemap.xml
```

**5. Verify after `astro build`:** confirm `dist/sitemap-index.xml` and `dist/sitemap-0.xml` exist, `dist/sitemap-0.xml` lists exactly 11 URLs (10 if `/review/` were ever a real page — it isn't, so 11), and `dist/sitemap.xml` no longer exists.

## Not verified / out of scope
- Whether `src/content/blog` frontmatter has a reliable `date`/`updatedDate` field usable for a future `serialize()`-based `lastmod` — didn't open the frontmatter of each post; recommend checking before deciding to reintroduce `lastmod` later.
- hreflang correctness (the ES/EN blog post pairs aren't cross-linked via `hreflang` in `Layout.astro`, which only hardcodes hreflang for `/`) — this is a technical-SEO/international-SEO issue, not a sitemap defect, flagging for the technical audit rather than scoring it here.
