# NutriScout Learning Digest: Comprehensive — All Focus Areas
**Date**: 2026-04-02
**Focus**: Frontend/UI, Backend, Nutrition/Food Tech, Target Audience/Market, + Weekly Top-5 Synthesis

---

## WEEKLY TOP-5 SYNTHESIS
*(Synthesized from all digests: 2026-03-30 through 2026-04-02)*

These are the highest-impact, cross-validated recommendations to implement next:

### #1 — Surface Apollo Evaluator results on dish cards
**Validated by**: Competitor digest (Cravr has no evaluator — visual moat), Market digest (33M allergy sufferers, safety = stickiest feature), UI/design digest (trust signals trending 2026)
**Current gap**: `src/lib/evaluator/index.ts` produces `warnings: string[]` on `DishResult`, but `src/app/page.tsx` (lines 96–117) drops `warnings` during mapping to `DishCardData`. Users who set dietary filters receive zero visual confirmation that dishes were evaluated safe. `DishCardData` (line 10 in `dish-card.tsx`) has no `warnings` field.
**What to do**:
1. Add `warnings?: string[]` to `DishCardData` in `src/components/dish-card.tsx`
2. Thread `warnings: d.warnings ?? []` through the page.tsx mapping
3. Render a green shield on cards with zero warnings + active dietary filters
4. Render a yellow caution badge with tooltip when `warnings.length > 0`
**Risk tier**: GREEN | **Impact**: 5 | **Effort**: 2 | **Urgency**: 5

### #2 — GLP-1 Friendly nutritional profile filter
**Validated by**: Competitor digest (MFP now explicitly targeting GLP-1 users), Nutrition digest (specific clinical priorities), Market digest (23% of US households, high-income, restaurant-going, underserved)
**Current gap**: `src/lib/orchestrator/types.ts` line 9 has `nutritional_goal?: "max_protein" | "min_calories" | "min_fat" | "min_carbs" | "balanced"` — no GLP-1 option. `src/types/index.ts` `NutritionalGoals.priority` matches same union. Filter drawer has no GLP-1 preset.
**What to do**:
1. Add `"glp1_friendly"` to the `nutritional_goal` union in both type files
2. In `src/lib/orchestrator/index.ts`, map `"glp1_friendly"` to: `protein_min_g ≥ 20, fiber_min_g ≥ 5 (if fiber tracked), calories_max ≤ 600`
3. Add "GLP-1 Friendly" as a named preset in `src/components/filter-drawer.tsx`
4. Do NOT add to `DietaryFlags` — this is a nutritional goal, not a dietary restriction
**Risk tier**: GREEN | **Impact**: 5 | **Effort**: 2 | **Urgency**: 4

### #3 — pgvector 0.8.0 iterative index scans for dietary-filtered vector search
**Validated by**: Backend research (9x faster, 100x more relevant results on sparse dietary categories)
**Current gap**: `prisma/schema.prisma` line 114 notes embedding handled via raw SQL. Without `hnsw.iterative_scan`, dietary-filtered similarity searches (e.g., "high-protein kosher dishes") stop scanning when they find the top-k results before dietary filter, returning fewer dishes than requested. This silently degrades results for niche dietary restrictions.
**What to do**:
1. Add `SET hnsw.iterative_scan = 'relaxed_order'; SET hnsw.max_scan_tuples = 10000;` as session-level settings before vector similarity queries in the search orchestrator
2. Find the raw SQL similarity query in `src/lib/orchestrator/` and prepend these settings
3. Monitor `pg_stat_user_indexes` for `idx_tup_read / idx_tup_fetch` ratio (high ratio = overfiltering)
**Risk tier**: GREEN | **Impact**: 5 | **Effort**: 1 | **Urgency**: 5

### #4 — Visual identity overhaul: Plus Jakarta Sans + warm food palette
**Validated by**: UI deep research (2026-03-31), Design inspiration digest, Food app UX research
**Current gap**: App uses Geist font (too cold/technical for food), pure white backgrounds (clinical), muted greens (not appetizing). Top 2026 food apps use warm cream backgrounds, coral/salmon accents, strong visual hierarchy.
**What to do**:
1. Replace Geist font with Plus Jakarta Sans in `src/app/layout.tsx`
2. Update `src/app/globals.css`: background → `#FAFAF5` (warm cream), add coral accent `#E8614A`, switch to charcoal `#1A1A2E` for body text
3. Add `backdrop-blur-md bg-white/70` to the macro badge overlay in `src/components/dish-card.tsx` (Liquid Glass effect)
4. Bottom nav: add top indicator line for active tab + filled icon states
**Risk tier**: GREEN | **Impact**: 4 | **Effort**: 3 | **Urgency**: 3

### #5 — Non-skippable dietary restriction capture in onboarding
**Validated by**: Audience psychology digest (30% higher retention with goal-setting), Market retention data (Day-30 target 12% vs. 8% industry), Onboarding research (goal capture = #1 retention anchor)
**Current gap**: No onboarding flow has been implemented yet (or it is minimal). Users who skip dietary setup don't see the value proposition of dish-first filtering.
**What to do**:
1. Build a 3-screen onboarding: (1) Goal selection (muscle/weight loss/dietary compliance/explore), (2) Dietary restrictions multi-select, (3) "We found X dishes near you for your profile" reveal
2. Make restriction capture step non-skippable — it is the core hook
3. Store in user profile / localStorage for guest users
4. Redirect returning users with no dietary profile to complete it on next launch
**Risk tier**: YELLOW | **Impact**: 5 | **Effort**: 3 | **Urgency**: 4

---

## PART 1: FRONTEND & UI TRENDS

### 1. Next.js 16.2 — Caching is now fully opt-in (AUDIT REQUIRED)
**Source**: https://nextjs.org/blog/next-16-2 (March 18, 2026)
**Relevance to NutriScout**: This is a breaking behavioral change from Next.js 13-15. All `fetch()` calls in Server Components that previously auto-cached now run at request time. Any data fetching in NutriScout that relied on implicit caching now runs fresh on every request — increasing DB load and API costs.
**Action item**: Audit every `fetch()` call in `src/app/` Server Components and add explicit `cache: 'force-cache'` or `next: { revalidate: 3600 }` where stale-while-revalidate behavior is appropriate (e.g., restaurant metadata, dish detail data). Dynamic search results should remain uncached (correct default).

**Priority Score**: Impact 4 | Effort 2 | Urgency 5 (could silently increase costs)

---

### 2. React Compiler is now stable in Next.js 16
**Source**: https://nextjs.org/blog/next-16 + https://react.dev/blog/2025/10/01/react-19-2
**Relevance to NutriScout**: The React Compiler auto-memoizes components, eliminating the need for manual `useMemo`, `useCallback`, and `React.memo`. Dish cards rendered in a 20-item search results grid would benefit from auto-memoization.
**Action item**: Add `experimental: { reactCompiler: true }` to `next.config.ts` if not already present. This is a zero-code-change win — the compiler handles memoization automatically.

**Priority Score**: Impact 3 | Effort 1 | Urgency 2

---

### 3. `useOptimistic` for the dish card save button
**Source**: https://react.dev/blog/2025/10/01/react-19-2 (React 19.2)
**Relevance to NutriScout**: `src/components/dish-card.tsx` currently uses `useState(initialFavorited)` + a `toggling` boolean for the heart button (lines 36-38). React 19.2's `useOptimistic` instantly updates UI while the mutation is in-flight, auto-reverts on error — eliminating the `toggling` spinner entirely.
**Action item**: In `src/components/dish-card.tsx`, replace the `favorited`/`toggling` state pattern in the `toggleFavorite` callback with `useOptimistic` — the heart toggles instantly without a loading state, reverts if `/api/favorites` returns an error.

**Priority Score**: Impact 3 | Effort 1 | Urgency 2

---

### 4. AVIF image format + blur placeholder + correct `sizes` attribute
**Source**: https://webpeak.org/blog/nextjs-image-optimization-techniques/ + Next.js docs
**Relevance to NutriScout**: Food photos are the highest-value content and likely the largest bandwidth cost. AVIF is 40-70% smaller than JPEG and 25-35% smaller than WebP. Next.js 16 supports AVIF delivery by default. `src/components/dish-card.tsx` uses `<Image>` already, but `sizes` and `placeholder="blur"` are likely not set.
**Action item**:
1. In `next.config.ts`, add `images: { formats: ['image/avif', 'image/webp'] }` — free bandwidth win
2. In `src/components/dish-card.tsx`, add `sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"` to the dish photo Image component
3. Add `placeholder="blur"` to all dish card images for perceived performance
4. Only add `priority` to the first visible card (pass an `index` prop, set `priority={index === 0}`)

**Priority Score**: Impact 4 | Effort 2 | Urgency 3

---

### 5. shadcn/ui CLI v4 — unified `radix-ui` package migration
**Source**: https://ui.shadcn.com/docs/changelog (March 2026)
**Relevance to NutriScout**: All `@radix-ui/react-*` packages were consolidated into a single `radix-ui` package in February 2026. Running the old individual packages causes version drift and larger installs.
**Action item**: Run `npx shadcn@latest upgrade` to migrate to the unified `radix-ui` package. Also run `npx shadcn@latest diff` to check if any currently-installed components have upstream updates.

**Priority Score**: Impact 2 | Effort 1 | Urgency 2

---

### 6. Inline filter chips (replace modal filter drawer on mobile)
**Source**: https://www.sanjaydey.com/mobile-ux-ui-design-patterns-2026-data-backed/ + top food app UX analysis
**Relevance to NutriScout**: The current `src/components/filter-drawer.tsx` is a bottom sheet modal. 2026 mobile UX pattern for food apps uses a horizontal scrollable chip row below the search bar — active filters visible at all times, one-tap to remove. Modal filters cost 2+ taps; inline chips cost 0 taps to see active state.
**Action item**: Add a filter chip strip below the search bar in `src/app/page.tsx` that shows active dietary restrictions as removable pills. The full drawer can remain for editing, but active filters must be visible without opening it.

**Priority Score**: Impact 4 | Effort 2 | Urgency 3

---

## PART 2: BACKEND OPTIMIZATION

### 7. pgvector iterative scans — CRITICAL FIX for dietary-filtered vector search
**Source**: https://aws.amazon.com/blogs/database/supercharging-vector-search-performance-and-relevance-with-pgvector-0-8-0-on-amazon-aurora-postgresql/ + https://www.postgresql.org/about/news/pgvector-080-released-2952/
**Relevance to NutriScout**: pgvector 0.8.0 introduced iterative index scans. Without it, a search for "high-protein vegan dishes" on a sparse vegan dataset may silently return 3 dishes instead of 20 because the vector index finds the top-k results first, then dietary filtering reduces the set below the requested LIMIT. This is silent — no error, just fewer results. With `hnsw.iterative_scan = 'relaxed_order'`, pgvector continues scanning until it finds enough filter-passing results.
**Action item**: In the search orchestrator's vector similarity query function, add before the query:
```sql
SET hnsw.iterative_scan = 'relaxed_order';
SET hnsw.max_scan_tuples = 10000;
```
These are session-level settings — safe to add per-query. Find the raw SQL vector query in `src/lib/orchestrator/` (likely in a helper that uses `$queryRaw`) and prepend these two SET statements.

**Priority Score**: Impact 5 | Effort 1 | Urgency 5

---

### 8. BullMQ `keepLastIfActive` for crawl job deduplication
**Source**: https://github.com/taskforcesh/bullmq/releases (v5.72.0, April 1, 2026)
**Relevance to NutriScout**: NutriScout uses `jobId: crawl-${googlePlaceId}` and `jobId: photo-${dishId}` for deduplication (per AGENTS.md). Current behavior: if a restaurant is being crawled and a duplicate crawl request arrives, the new job is dropped. New `keepLastIfActive` option queues the new job to run after the active one completes — ensuring re-crawl requests aren't silently lost when a crawl is in progress.
**Action item**: In `workers/crawl-worker.ts` where crawl jobs are added, update the job options to include `deduplication: { id: 'crawl-${googlePlaceId}', keepLastIfActive: true }`. Apply the same pattern to photo analysis jobs in the photo worker.

**Priority Score**: Impact 3 | Effort 1 | Urgency 3

---

### 9. Redis 8 I/O threading — free 30% throughput increase
**Source**: https://redis.io/blog/redis-8-ga/ + https://redis.io/blog/announcing-redis-86-performance-improvements-streams/
**Relevance to NutriScout**: Redis 8 delivers 30%+ throughput increase for caching workloads (10% SET, 90% GET pattern — which matches NutriScout's search cache) with I/O threading enabled. Also adds `volatile-lrm` eviction policy, which evicts least-recently-*modified* keys rather than least-recently-*accessed* — better for search caches where fresh data should survive.
**Action item**:
1. Enable `io-threads 4` in the Redis server config (or Redis Cloud config panel)
2. Consider switching eviction policy from `allkeys-lru` to `allkeys-lrm` for the search cache Redis instance

**Priority Score**: Impact 3 | Effort 1 | Urgency 2

---

### 10. GIN index on `dietaryFlags` JSONB (still missing)
**Source**: `agent-workspace/improvement-logs/2026-04-01-backend.md` (documented as still needed)
**Relevance to NutriScout**: The dietary flag filters (`dietaryFlags->>'vegan' = 'true'`) are executed on every search. Without a GIN index, these are sequential scans. The 2026-04-01 backend agent noted this requires a raw SQL migration that Prisma can't express.
**Action item**: Create a raw SQL migration file at `prisma/migrations/YYYYMMDDHHMMSS_add_dietary_gin_index/migration.sql`:
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dishes_dietary_flags
ON dishes USING GIN (("dietaryFlags") jsonb_path_ops);
```
This uses `jsonb_path_ops` which is optimized for `@>` operator queries. The orchestrator's JSONB path queries should be rewritten to use `@>` for index utilization.

**Priority Score**: Impact 4 | Effort 2 | Urgency 4

---

### 11. Hybrid FTS + pgvector scoring for dish name search
**Source**: https://blog.vectorchord.ai/postgresql-full-text-search-fast-when-done-right-debunking-the-slow-myth
**Relevance to NutriScout**: Dish name searches ("pad thai", "tikka masala") are short text — standard `ts_rank` TF-IDF underweights exact short-document matches. A hybrid query combining `ts_rank` (text relevance) and `1 - (embedding <=> query_embedding)` (semantic similarity) produces better dish name relevance than either alone.
**Action item**: In the search orchestrator's text search path, implement a hybrid scoring query that combines `ts_rank * 0.4 + vector_score * 0.6`. The `search_vector` tsvector column and GIN index are referenced in the codebase (per backend log: `geo.ts`) but need a raw SQL migration if not yet created.

**Priority Score**: Impact 3 | Effort 3 | Urgency 2

---

## PART 3: NUTRITION & FOOD TECH

### 12. AGENTS.md: Vision analyzer uses Gemini Flash, not Claude Haiku (CORRECTION)
**Source**: `src/lib/agents/vision-analyzer/index.ts` line 3 — `import { getGeminiClient, GEMINI_FLASH }` and line 295 comment "Legacy — kept for type compatibility but Gemini is now the primary vision model"
**Relevance to NutriScout**: AGENTS.md currently states "Model: claude-haiku-4-5 for cost efficiency" for the Vision Analyzer. This is outdated and misleading for future agents. The actual model is `GEMINI_FLASH`.
**Action item**: Update `nutriscout/AGENTS.md` Vision Analyzer section to reflect actual model: `GEMINI_FLASH` (Gemini Flash). Also verify what `GEMINI_FLASH` maps to in `src/lib/ai/clients.ts` — confirm it is the current generation Gemini Flash model and not an outdated constant.

**Priority Score**: Impact 3 | Effort 1 | Urgency 3 (documentation accuracy matters for multi-agent coordination)

---

### 13. USDA synonym map missing v14.3 additions (jalapeño, poblano, serrano, seafood)
**Source**: https://fdc.nal.usda.gov/log/ (USDA FoodData Central v14.3, March 12, 2026)
**Relevance to NutriScout**: `src/lib/usda/client.ts` `USDA_SYNONYMS` map (lines 127-160) has 30 entries. USDA v14.3 added new Foundation Foods including jalapeño, poblano, serrano peppers, plus anchovies, cod, halibut, lobster, mahi mahi, scallops, sea bass, snapper. Restaurant dishes featuring these ingredients will fail USDA lookup and fall back to vision-only estimates (lower accuracy).
**Action item**: Add to `USDA_SYNONYMS` in `src/lib/usda/client.ts`:
```typescript
"jalapeño": "peppers, hot chili, green, raw",
"jalapeno": "peppers, hot chili, green, raw",
"poblano": "peppers, hot chili, green, raw",
"serrano": "peppers, hot chili, green, raw",
"halibut": "fish, halibut, cooked",
"scallops": "scallops, cooked",
"mahi mahi": "fish, mahi-mahi, cooked",
"cod": "fish, cod, cooked",
"snapper": "fish, snapper, cooked",
"lobster": "lobster, cooked",
```

**Priority Score**: Impact 3 | Effort 1 | Urgency 2

---

### 14. Sesame is now the FDA 9th major allergen — verify full coverage
**Source**: https://media.market.us/food-allergies-statistics/ + FDA sesame labeling regulation (2023)
**Relevance to NutriScout**: Sesame was added as the 9th major allergen in 2023. `src/lib/evaluator/index.ts` handles sesame via keyword matching (`ALLERGEN_KEYWORDS: { sesame: ["sesame", "tahini"] }`) but does NOT have a dedicated `sesame_free` dietary flag. This means sesame filtering is description-text only — less reliable than the flag-based approach used for nut_free and gluten_free. With 32M Americans having food allergies and rising prevalence, this gap matters.
**Action item**: Consider adding `sesame_free: boolean | null` to `DietaryFlags` in `src/types/index.ts`. The Menu Crawler's dietary flag inference logic would need to classify sesame absence, and the Apollo Evaluator would need to apply `ALLERGY_CRITICAL_MIN: 0.85` threshold (same as nut_free/gluten_free). This is a YELLOW tier change — needs careful implementation.

**Priority Score**: Impact 4 | Effort 3 | Urgency 3

---

### 15. AI vision accuracy ceiling is ~±15% calorie error — make uncertainty visible
**Source**: https://pmc.ncbi.nlm.nih.gov/articles/PMC12229984/ (systematic review, 13 studies) + https://arxiv.org/html/2504.06925 (Gemini 2.0 Flash benchmark: 70.16% food ID)
**Relevance to NutriScout**: Scientific research confirms ±10-15% calorie error is the current floor for AI vision-based macro estimation on restaurant photos. Multi-component dishes cause 18-25% accuracy drop vs. single-ingredient dishes. The existing min/max range model is scientifically correct. However, the UI currently shows averaged values (`avg()` function in `dish-card.tsx` line 30-33) — hiding the uncertainty that the range was designed to communicate.
**Action item**: In `src/components/dish-card.tsx`, display the macro range instead of avg for calories — e.g., "~480–620 cal" instead of "550 cal". This is more honest and differentiates NutriScout from apps that show false-precision single numbers. For very tight ranges (max - min < 50 cal), showing avg is fine.

**Priority Score**: Impact 3 | Effort 1 | Urgency 2

---

## PART 4: TARGET AUDIENCE & MARKET

### 16. Halal food market is $2.24T — NutriScout's halal filter is severely under-marketed
**Source**: https://www.researchandmarkets.com/reports/5744211/halal-food-market-report (2026) + kosher market $22.8B
**Relevance to NutriScout**: Halal dining is a $2.24 trillion global market growing at 13.4% CAGR. It's consistently the most-requested minority dietary filter and is currently one of the hardest to satisfy at a restaurant — menus rarely disclose halal certification clearly. NutriScout's dish-level halal flag (with conservative null defaults) is genuinely valuable infrastructure that competitors don't have at this depth.
**Action item**: Prioritize menu crawl coverage for halal-certified restaurants in target markets. In `src/components/filter-drawer.tsx`, move "Halal" to the top of the dietary list (currently buried among other options). Consider a "Halal Verified" badge that distinguishes certification-sourced flags from inference-based flags.

**Priority Score**: Impact 4 | Effort 2 | Urgency 3

---

### 17. Retention target: 12% Day-30 vs. 8% industry average — onboarding is the lever
**Source**: https://getstream.io/blog/app-retention-guide/ (2026 benchmarks)
**Relevance to NutriScout**: Health/fitness apps average 8.48% Day-30 retention. A 12%+ target is achievable with: (1) goal-setting onboarding (30% retention boost), (2) proximity push notifications for new matching dishes, (3) saved searches as re-engagement hooks. The single highest-ROI retention investment is making users capture their dietary profile in onboarding.
**Action item**: Add a BullMQ notification job: when a new dish is crawled that matches a user's saved filters, queue a push notification. Target file: new worker at `workers/notification-worker.ts` that queries users with matching dietary profiles for newly-added dishes.

**Priority Score**: Impact 4 | Effort 3 | Urgency 3

---

### 18. Shareable dish cards for TikTok/social acquisition (Gen Z channel)
**Source**: https://www.deliverect.com/en/blog/trending/gen-z-their-identity-food-delivery-behavior-and-key-stats-in-2024 + https://dana.dexterra.com/blog/millennials-vs-gen-z-food-trends-whats-cooking-in-2026/
**Relevance to NutriScout**: 63% of Gen Z regularly use food delivery apps; TikTok is the #1 food discovery platform for this cohort. NutriScout has no social sharing. A shareable dish card image (showing photo + macros + dietary badges) is a zero-cost acquisition channel — each share is a product demo.
**Action item**: Create an OG image generator for dish detail pages at `/api/og/dish/[id]` using `@vercel/og`. The generated image should show: dish photo, name, restaurant, calories+protein+carbs+fat badges, and dietary flag icons. Add `<meta property="og:image">` to the dish detail page head. This makes links shared from NutriScout render rich previews on iMessage, Twitter/X, TikTok bios, etc.

**Priority Score**: Impact 4 | Effort 2 | Urgency 3

---

### 19. Delivery platform deep-links close the discovery-to-order loop
**Source**: https://oysterlink.com/spotlight/food-delivery-market-share-statistics/ (DoorDash 56% market share)
**Relevance to NutriScout**: 51% of US consumers turn to third-party platforms when choosing a restaurant for delivery. NutriScout is upstream of this decision — we surface the dish, but currently the Logistics Poller's delivery platform availability is stub/mock data. A deep-link from dish detail into the restaurant's DoorDash page would close the discovery-to-order funnel.
**Action item**: In `src/app/dish/[id]/page.tsx`, add "Order on DoorDash" / "Order on Uber Eats" buttons using the restaurant's `googlePlaceId` to construct the search URL. These can be fuzzy links (search by restaurant name) until the delivery platform stubs are fully implemented. Target the `delivery_platforms` field already on `DishCardData`.

**Priority Score**: Impact 4 | Effort 1 | Urgency 3

---

### 20. Macro source transparency on dish detail — trust signal for biohackers
**Source**: https://www.businessofapps.com/data/fitness-app-market/ + biohacker user research
**Relevance to NutriScout**: The biohacker segment (Cronometer users, fitness-focused) is NutriScout's highest-value user type — they care deeply about data provenance. `src/components/confidence-dot.tsx` and `macro_source` field exist. The `getSourceIcon()` pattern in AGENTS.md is implemented. But these are likely not prominently surfaced on the dish detail page.
**Action item**: On the dish detail page (`src/app/dish/[id]/page.tsx`), add a visible macro source section: "Macros estimated from: USDA Foundation Foods (protein, carbs), AI vision analysis (calories)" with a confidence percentage. Use the `macro_source` field from the dish record. This directly addresses the #1 trust driver for the biohacker segment.

**Priority Score**: Impact 3 | Effort 1 | Urgency 2

---

## CODE RECOMMENDATIONS SUMMARY

All recommendations cross-referenced with actual source files:

| # | Title | Risk Tier | Target File(s) | Impact | Effort | Urgency |
|---|-------|-----------|----------------|--------|--------|---------|
| 1 | Surface evaluator warnings on dish cards | GREEN | `dish-card.tsx`, `page.tsx` | 5 | 2 | 5 |
| 2 | GLP-1 nutritional goal filter | GREEN | `orchestrator/types.ts`, `types/index.ts`, `filter-drawer.tsx` | 5 | 2 | 4 |
| 3 | pgvector iterative_scan session settings | GREEN | `src/lib/orchestrator/` (raw SQL query) | 5 | 1 | 5 |
| 4 | GIN index on dietaryFlags JSONB | GREEN | `prisma/migrations/` | 4 | 2 | 4 |
| 5 | AVIF + blur placeholder + correct sizes | GREEN | `next.config.ts`, `dish-card.tsx` | 4 | 2 | 3 |
| 6 | Inline filter chips below search bar | GREEN | `src/app/page.tsx` | 4 | 2 | 3 |
| 7 | Halal filter priority + Verified badge | GREEN | `filter-drawer.tsx` | 4 | 2 | 3 |
| 8 | Delivery platform deep-links | GREEN | `dish/[id]/page.tsx` | 4 | 1 | 3 |
| 9 | USDA synonym map v14.3 additions | GREEN | `src/lib/usda/client.ts` | 3 | 1 | 2 |
| 10 | AGENTS.md vision model correction | GREEN | `nutriscout/AGENTS.md` | 3 | 1 | 3 |
| 11 | useOptimistic for save button | GREEN | `dish-card.tsx` | 3 | 1 | 2 |
| 12 | React Compiler enable | GREEN | `next.config.ts` | 3 | 1 | 2 |
| 13 | BullMQ keepLastIfActive deduplication | GREEN | `workers/crawl-worker.ts` | 3 | 1 | 3 |
| 14 | Redis io-threads + eviction policy | GREEN | Redis config | 3 | 1 | 2 |
| 15 | Next.js fetch() caching audit | GREEN | `src/app/` Server Components | 4 | 2 | 5 |
| 16 | Macro range display (not avg) on cards | GREEN | `dish-card.tsx` | 3 | 1 | 2 |
| 17 | OG image for dish detail sharing | YELLOW | `src/app/api/og/dish/[id]/route.tsx` | 4 | 2 | 3 |
| 18 | Sesame_free dietary flag | YELLOW | `types/index.ts`, evaluator, crawler | 4 | 3 | 3 |
| 19 | Onboarding flow (3-screen goal capture) | YELLOW | new `src/app/onboarding/` | 5 | 3 | 4 |
| 20 | Visual identity (font + palette) | YELLOW | `layout.tsx`, `globals.css`, `dish-card.tsx` | 4 | 3 | 3 |

---

## COMPETITOR MOVES (Updated)

- **Cravr** (v1.1.1, SF-only): Still early stage (6 ratings). No dietary evaluator. Gap to close: our evaluator moat is invisible without the safety badge UI.
- **DoorDash Zesty** (NYC/SF beta): Restaurant-first, social layer. No dish-level search or dietary filtering. Monitor.
- **MyFitnessPal** (Winter 2026): Added GLP-1 tracker — validates the segment for NutriScout.
- **Nestlé Vital Pursuit** (launched): High-protein GLP-1 frozen meals. Shows CPG is rushing into this segment. NutriScout should capture restaurant equivalent.

---

## DESIGN INSPIRATION

- **Liquid Glass** (Apple iOS 2026 aesthetic): Frosted glass overlays, `backdrop-blur-md bg-white/70`, on dish photo macro badges
- **Bold macro hierarchy**: Display calories in 28px+ font on dish cards; protein in brand color
- **Warm cream backgrounds** (`#FAFAF5`) replace pure white — food photos pop more
- **Coral/salmon CTA accent** (`#E8614A`) for primary actions, high-fiber/health signals
- **Diet safety badges**: Green shield for verified-safe, yellow triangle for uncertain, gray for unverified — consistent with 2026 trust signal patterns

---

## SOURCES

**Frontend/UI:**
- [Next.js 16.2 Blog](https://nextjs.org/blog/next-16-2) (Mar 18, 2026)
- [React 19.2 Blog](https://react.dev/blog/2025/10/01/react-19-2)
- [shadcn/ui Changelog](https://ui.shadcn.com/docs/changelog) (Mar 2026)
- [Tailwind CSS v4.0 Blog](https://tailwindcss.com/blog/tailwindcss-v4)
- [7 Mobile UX Patterns 2026](https://www.sanjaydey.com/mobile-ux-ui-design-patterns-2026-data-backed/)
- [Top 10 Food App UX Designs 2026](https://uistudioz.com/blog/top-10-inspiring-food-delivery-app-ui-ux-designs/)
- [Next.js Image Optimization 2026](https://webpeak.org/blog/nextjs-image-optimization-techniques/)

**Backend:**
- [pgvector 0.8.0 Release](https://www.postgresql.org/about/news/pgvector-080-released-2952/)
- [pgvector on Aurora — AWS](https://aws.amazon.com/blogs/database/supercharging-vector-search-performance-and-relevance-with-pgvector-0-8-0-on-amazon-aurora-postgresql/)
- [Redis 8 GA](https://redis.io/blog/redis-8-ga/) + [Redis 8.6](https://redis.io/blog/announcing-redis-86-performance-improvements-streams/)
- [BullMQ v5.72.0 Releases](https://github.com/taskforcesh/bullmq/releases)
- [Prisma 7 Performance](https://www.prisma.io/blog/announcing-prisma-orm-7-0-0)
- [PostgreSQL BM25 FTS](https://blog.vectorchord.ai/postgresql-full-text-search-fast-when-done-right-debunking-the-slow-myth)

**Nutrition/Food Tech:**
- [AI Food Recognition Benchmarks 2026](https://ai-food-tracker.com/)
- [Vision-Language Models Dietary Assessment](https://arxiv.org/html/2504.06925) (arXiv, Apr 2026)
- [USDA FoodData Central v14.3](https://fdc.nal.usda.gov/log/)
- [GLP-1 Nutritional Priorities — ASN](https://nutrition.org/nutritional-priorities-to-support-glp-1-therapy-for-obesity/)
- [GLP-1 Users Restaurant Behavior — Circana](https://www.globenewswire.com/news-release/2026/01/14/3218743/0/en/GLP-1-Users-Aren-t-Ditching-Restaurants-But-Their-Ordering-Habits-Are-Changing-New-Circana-Research-Finds.html)
- [Food Allergy Statistics 2026](https://media.market.us/food-allergies-statistics/)
- [AI Dietary Assessment — PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC12229984/)

**Market/Audience:**
- [Diet and Nutrition App Stats 2026](https://media.market.us/diet-and-nutrition-apps-statistics/)
- [Halal Food Market 2026](https://www.researchandmarkets.com/reports/5744211/halal-food-market-report)
- [Kosher Market 2026-2034](https://www.globenewswire.com/news-release/2026/03/23/3260654/28124/en/Kosher-Food-Market-Analysis-Report-2026-2034.html)
- [App Retention Benchmarks 2026](https://getstream.io/blog/app-retention-guide/)
- [Gen Z Food Delivery Behavior](https://www.deliverect.com/en/blog/trending/gen-z-their-identity-food-delivery-behavior-and-key-stats-in-2024)
- [Food Delivery Market Share 2026](https://oysterlink.com/spotlight/food-delivery-market-share-statistics/)
- [Personalized Nutrition Market](https://www.globenewswire.com/news-release/2026/03/11/3253884/0/en/Personalized-Nutrition-Market-Set-to-Reach-30-94-Billion-by-2030-at-14.4-CAGR.html)
- [Business of Apps Fitness 2026](https://www.businessofapps.com/data/fitness-app-market/)
