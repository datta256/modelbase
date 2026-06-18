# Objaverse Explorer — Technical Architecture & Programmatic SEO Plan

> A Sketchfab-style 3D asset discovery platform built on the Objaverse dataset,
> engineered from the ground up for **programmatic SEO at scale** (800k+ indexable pages).

---

## 1. Goal

Turn the current client-only search SPA into a crawlable, server-rendered
discovery platform where **every asset, category, tag, and author has its own
indexable URL**. Capture long-tail search demand ("low poly chair 3d model",
"free spaceship glb", "<author> 3d models") the same way Sketchfab does.

---

## 2. Current State (as-is)

| Layer | File | What it does | Limitation |
|-------|------|--------------|------------|
| ETL (download) | `download_annotations.py` | Pulls full Objaverse annotations → `annotations.json` (~3 GB) | One-shot, no incremental refresh |
| ETL (import) | `importer/import.py` | Streams JSON → SQLite `assets` + FTS5 `assets_fts` | Drops/recreates tables each run |
| API | `backend/server.js` | Express `/search` endpoint over FTS5 | Single endpoint, no pagination, no facets |
| UI | `frontend/index.html` | Vanilla SPA: sidebar search + iframe preview | **Zero indexable pages**, hardcoded `localhost:3000`, stray markdown fences (lines 164, 216) |

### Existing data model (`assets`)
```
uid, name, description, tags, thumbnail, uri,
viewer_url, embed_url, downloadable,
face_count, vertex_count, texture_count,
category, author
```

### Core SEO problem
The SPA renders one empty HTML shell; all content is fetched client-side from
`localhost`. Search engines index **nothing**. There are no per-asset URLs, no
metadata, no sitemap, no structured data.

---

## 3. Target Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  CLIENT / CRAWLER                                              │
│  Googlebot · users · social scrapers (OG)                     │
└───────────────────────────┬──────────────────────────────────┘
                            │ HTTPS
┌───────────────────────────▼──────────────────────────────────┐
│  EDGE / CDN  (Vercel / Netlify / Cloudflare)                  │
│  ISR cache · sharded sitemaps · OG image cache                │
└───────────────────────────┬──────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────┐
│  NEXT.JS 15 APP (App Router, TypeScript, RSC)                 │
│  • SSG/ISR programmatic pages                                 │
│  • Server data layer (Drizzle)                                │
│  • JSON-LD · canonical · OpenGraph · dynamic OG images        │
│  • robots.txt · sitemap-[n].xml                               │
└───────────────────────────┬──────────────────────────────────┘
                            │ server-side queries
┌───────────────────────────▼──────────────────────────────────┐
│  DATA LAYER                                                   │
│  Phase 1: SQLite (objaverse.db) + FTS5  via Drizzle           │
│  Phase 2: Postgres + Meilisearch/Typesense (faceted search)   │
└───────────────────────────┬──────────────────────────────────┘
                            │ ETL (scheduled / incremental)
┌───────────────────────────▼──────────────────────────────────┐
│  PYTHON IMPORTER  (Objaverse annotations → DB)                │
└──────────────────────────────────────────────────────────────┘
```

---

## 4. Tech Stack & Rationale

| Concern | Choice | Why |
|---------|--------|-----|
| Framework | **Next.js 15 (App Router) + TypeScript** | Hybrid SSG/ISR is the single most important lever for programmatic SEO; React Server Components keep payloads small |
| Styling | **Tailwind CSS + shadcn/ui + Lucide** | Fast, modern, Sketchfab-like dark UI; accessible primitives |
| ORM | **Drizzle ORM** | Type-safe, lightweight, runs on existing SQLite with zero migration; portable to Postgres later |
| Search (P1) | **SQLite FTS5** (existing) | Already populated; good enough to launch |
| Search (P2) | **Meilisearch / Typesense** | Instant faceted search, typo tolerance, filters by category/poly-count/downloadable |
| 3D preview | **Sketchfab embed** (existing `embed_url`) + optional **`<model-viewer>`** for GLB | Reuses existing data; `<model-viewer>` for owned assets |
| Sitemaps | **next-sitemap** (sharded) | Auto-splits into 50k-URL files for 800k+ assets |
| OG images | **`@vercel/og` / Satori** | Dynamic per-asset social cards = higher CTR |
| Hosting | **Vercel** (or Netlify) | Native ISR + edge caching |

---

## 5. URL & Page Architecture (the SEO engine)

| Route | Render | Purpose | Index? |
|-------|--------|---------|--------|
| `/` | SSG/ISR | Landing, featured, popular categories | ✅ |
| `/models/[uid]/[slug]` | ISR | **Primary money page** — single asset | ✅ |
| `/category/[category]` | ISR | Category hub, paginated grid | ✅ |
| `/category/[category]/page/[n]` | ISR | Paginated category | ✅ (rel next/prev) |
| `/tags/[tag]` | ISR | Tag hub | ✅ |
| `/authors/[author]` | ISR | Author profile + their assets | ✅ |
| `/downloadable` | ISR | Free/downloadable assets hub | ✅ |
| `/search?q=` | dynamic (CSR/SSR) | Live search | ❌ `noindex` |
| `/sitemap-[n].xml` | generated | Sharded sitemap index | n/a |
| `/robots.txt` | generated | Crawl directives | n/a |

### Slug strategy
`/models/[uid]/[slug]` where `slug = kebab-case(name)`. UID guarantees uniqueness;
slug carries keywords. Mismatched slug → 301 to canonical.

### Internal linking mesh
Each asset page links to: its **category**, each **tag**, its **author**, and
**8–12 related models** (same category/shared tags). This spreads crawl equity
and keeps users on-site. Category/tag/author hubs link back to assets → dense
internal graph that search engines love.

---

## 6. On-Page SEO Spec (per asset page)

- **`<title>`**: `{name} — Free 3D Model | Objaverse Explorer` (or "3D Model" if not downloadable)
- **meta description**: first ~155 chars of description + category + poly count
- **canonical**: absolute URL with correct slug
- **OpenGraph / Twitter**: title, description, `og:image` = best thumbnail (or dynamic OG card)
- **JSON-LD**: schema.org [`3DModel`](https://schema.org/3DModel) + `BreadcrumbList`; `Product` + `Offer` (price 0) when downloadable
- **Breadcrumbs**: Home › Category › Asset (visual + structured)
- **H1**: asset name; semantic headings for spec sections
- **Image SEO**: descriptive `alt`, `width`/`height`, lazy-load, `next/image`

### JSON-LD example (asset)
```json
{
  "@context": "https://schema.org",
  "@type": "3DModel",
  "name": "Low Poly Wooden Chair",
  "description": "...",
  "thumbnailUrl": "https://.../thumb.jpg",
  "encodingFormat": "model/gltf-binary",
  "author": { "@type": "Person", "name": "<author>" },
  "isAccessibleForFree": true,
  "keywords": "chair, furniture, low poly"
}
```

---

## 7. Data Layer Plan

### Phase 1 — SQLite (launch fast)
- Wrap existing `objaverse.db` with **Drizzle** schema mirroring the `assets` table.
- Server-side queries only (never expose DB to client).
- Add indexes for hub pages:
  ```sql
  CREATE INDEX idx_assets_category    ON assets(category);
  CREATE INDEX idx_assets_author      ON assets(author);
  CREATE INDEX idx_assets_downloadable ON assets(downloadable);
  ```
- **Normalize tags** (currently a space-joined string) into a `tags` + `asset_tags`
  join table to power `/tags/[tag]` hubs efficiently.

### Phase 2 — Postgres + Meilisearch (scale)
- Migrate `assets` → Postgres (managed: Neon/Supabase).
- Index into **Meilisearch/Typesense** with facets: `category`, `downloadable`,
  `face_count` ranges, `texture_count`, `author`.
- Powers instant search + filter UI without hammering the primary DB.

### Proposed normalized schema (Phase 1.5)
```
assets(uid PK, name, slug, description, thumbnail, uri,
       viewer_url, embed_url, downloadable,
       face_count, vertex_count, texture_count,
       category, author, created_at)

tags(id PK, name UNIQUE, slug UNIQUE)
asset_tags(asset_uid FK, tag_id FK)        -- many-to-many
categories(slug PK, name, count)           -- precomputed counts for hubs
authors(username PK, asset_count)          -- precomputed
```

---

## 8. ETL / Importer Improvements

- Make `importer/import.py` **idempotent / incremental** (UPSERT by `uid`
  instead of DROP TABLE) so refreshes don't nuke the DB.
- Populate `slug`, normalized `tags`/`asset_tags`, and precomputed
  `categories.count` / `authors.asset_count` during import.
- Add a `updated_at` watermark for future delta imports.
- Schedule via cron / GitHub Action for periodic refresh.

---

## 9. UI / UX (Sketchfab-like)

- **Dark theme**, masonry/grid asset cards with hover 3D-spin or thumbnail zoom.
- **Faceted sidebar**: category, downloadable, poly-count slider, has-textures.
- **Asset page**: large embed viewer top, spec panel (faces/verts/textures),
  download CTA, author block, related-models carousel, breadcrumb.
- **Search-as-you-type** with debounce (already in the prototype) → upgrade to
  Meilisearch in P2.
- **Core Web Vitals**: `next/image`, route-level code splitting, streamed RSC,
  preconnect to thumbnail CDN, lazy-load the heavy 3D iframe until interaction.

---

## 10. Performance & Crawl Budget

- **ISR** with `revalidate` (e.g. 24h) so 800k pages aren't built upfront —
  built on first request, cached at edge thereafter.
- **Sharded sitemaps** (50k URLs/file) + sitemap index, submitted to Search Console.
- **Pagination** with `rel="next"/"prev"` on hub pages.
- Lazy-load the Sketchfab iframe (biggest payload) behind a click/intersection.
- Cache headers + edge CDN for static assets and OG images.

---

## 11. Phased Roadmap

| Phase | Scope | Outcome |
|-------|-------|---------|
| **P0** | Fix `index.html` stray fences + config-driven API URL | Working prototype |
| **P1** | Next.js scaffold + Drizzle over SQLite + `/models/[uid]` ISR pages + JSON-LD + sitemap | **Indexable launch** |
| **P2** | Category/tag/author hubs + internal linking mesh + dynamic OG images | Programmatic SEO surface area |
| **P3** | Tag normalization + faceted search (Meilisearch) + related-models | Sketchfab-grade discovery |
| **P4** | Postgres migration + incremental ETL + analytics + Search Console feedback loop | Production scale |

---

## 12. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| 800k pages overwhelm build | ISR on-demand, not full SSG |
| Thin/duplicate content penalty | Rich per-asset specs + unique JSON-LD + related links; `noindex` empty/dup pages |
| 3 GB `annotations.json` in repo | Keep out of git (`.gitignore`), store in object storage / regenerate |
| 800 MB SQLite in serverless | Read-replica/Turso (libSQL) or move to Postgres in P2 |
| Hotlinked thumbnails break | Proxy/cache via `next/image` loader |
| Tags stored as flat string | Normalize into join table (Section 7) |

---

## 13. Immediate Next Steps (when greenlit)

1. `create-next-app` (TS, App Router, Tailwind) in `/web`.
2. Add Drizzle + SQLite schema mirroring `assets`; read-only server queries.
3. Build `/models/[uid]/[slug]` with full metadata + JSON-LD.
4. Add `next-sitemap` (sharded) + `robots.txt`.
5. Build category/tag/author hubs + related-models linking.
6. Layer Meilisearch + facets (P3).
