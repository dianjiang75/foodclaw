<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# NutriScout Agent Architecture

## Core Agents (in codebase)

### 1. Vision Analyzer (`src/lib/agents/vision-analyzer/`)
- Analyzes food photos using Gemini Flash vision model (NOT Claude — migrated; `import { getGeminiClient, GEMINI_FLASH }` in index.ts)
- Estimates macros (calories, protein, carbs, fat) as ranges (min/max)
- Returns confidence scores and dietary flag inferences
- Model: `GEMINI_FLASH` (Gemini Flash) for cost efficiency; Claude Haiku import is legacy/unused

### 2. Menu Crawler (`src/lib/agents/menu-crawler/`)
- Crawls restaurant menus from 3 sources: website HTML, Google Maps photos, delivery platforms (stub)
- Uses Claude to extract structured menu items from photos
- Analyzes ingredients for dietary flags (vegan, GF, halal, kosher, nut-free)
- CRITICAL: dietary flags use conservative defaults — `null` (unknown) not `true` when uncertain

### 3. Review Aggregator (`src/lib/agents/review-aggregator/`)
- Summarizes dish-specific reviews from Google and Yelp
- Extracts sentiment, common praises, complaints, dietary warnings
- Links review data to individual dishes, not just restaurants

### 4. Logistics Poller (`src/lib/agents/logistics-poller/`)
- Polls foot traffic data (Google Popular Times patterns)
- Tracks estimated wait times by day-of-week and hour
- Delivery platform availability (stub — returns mock data)

### 5. Search Orchestrator (`src/lib/orchestrator/`)
- Main search pipeline: query → cache check → DB query → logistics → evaluation → cache store
- Applies dietary filters, macro filters, text search, category/cuisine filters
- Uses Redis semantic cache for repeat queries

### 6. Apollo Evaluator (`src/lib/evaluator/`)
- Post-search dietary safety verification layer
- Removes unsafe dishes, adds warning labels to uncertain ones
- Allergy-critical restrictions (nut_free, gluten_free) require explicit `true` + 85%+ confidence

## Automation Agents (skills)

### 7. Learning Agent (`/learn` skill)
- Runs nightly at 2 AM via macOS launchd
- Researches: Frontend, Backend, Competitors, Market, Design, Nutrition, Food Tech
- Writes structured digests to `agent-workspace/learning-digests/`
- Each finding includes risk tier, impact/effort/urgency scores, target files

### 8. Improvement Agent (`/improve` skill)
- Runs nightly at 4 AM via macOS launchd
- Reads latest digests, measures baseline metrics (tsc, lint, tests, bundle size)
- Implements GREEN/YELLOW tier changes, validates each individually
- Reverts on failure, writes improvement log with before/after metrics

### 9. User Test Agent (`/user-test` skill)
- Runs nightly at 6 AM via macOS launchd, after learn and improve complete
- Simulates 5 customer personas end-to-end via real API calls:
  - **Explorer Emma** — browses categories, searches, tests navigation and empty states
  - **Protein Pete** — max protein sort, macro filtering, nutritional goal accuracy
  - **Allergy Alice** — nut-free + gluten-free safety, evaluator thresholds, false positives (SAFETY CRITICAL)
  - **Speedy Sam** — wait time sort, distance filtering, delivery data
  - **Foodie Fiona** — reviews, photos, macro source transparency, dish detail completeness
- Writes reports to `agent-workspace/user-test-reports/` and maintains BACKLOG.md
- CRITICAL/MAJOR issues feed back as top-priority items for the next /learn and /improve cycle

## Discovered Patterns

- Dietary flags in DB are JSONB with path queries: `dietaryFlags: { path: [key], equals: true }`
- Redis cache keys: `query:{hash}` for search results
- All macro values stored as Decimal in Prisma, cast to Number in API responses
- Menu source priority: website HTML > Google Photos > delivery platforms
- `getSourceIcon()` returns JSX elements (not component references) to avoid React render-phase component creation
- `optimizePackageImports: ["lucide-react"]` in next.config.ts for tree-shaking
- Profile page uses `next/link` `<Link>` for internal nav (not `<a>`)
- Cache key for search must include `searchText`, `categories`, `sortBy` — not just dietary + geo
- BullMQ job deduplication via `jobId: crawl-${googlePlaceId}` and `jobId: photo-${dishId}`
- USDA ingredient matching uses synonym map (e.g., "shrimp" → "shrimp, cooked") in `usda/client.ts`
- API routes use `apiSuccess()`/`apiError()` from `src/lib/utils/api-response.ts` for consistent responses
- UUID validation on path params via regex before Prisma query (prevents DB errors on bad IDs)
- Worker files use singleton PrismaClient (module-level), not per-job instantiation
- `viewportFit: "cover"` in layout.tsx is required for iOS safe-area-inset CSS to work
- Price parsing: use `parsePriceString()` for ranges, "Market Price", "$$$" — never raw `parseFloat`
- Vision batch analysis uses `Promise.allSettled` with `CONCURRENCY=3` — tests must account for non-sequential execution
- `DishCardData` interface (dish-card.tsx) does NOT have a `warnings` field — evaluator warnings are dropped in page.tsx mapping (known gap, needs fix)
- `NutritionalGoals.priority` union: `"max_protein" | "min_calories" | "min_fat" | "min_carbs" | "balanced"` — no GLP-1 option yet
- Sesame allergen handled via keyword matching in evaluator (no dedicated `sesame_free` dietary flag)
- USDA_SYNONYMS map in `src/lib/usda/client.ts` has 100+ entries (expanded 2026-04-02); includes prep-aware calorie multipliers
- `estimateMacros()` now accepts optional `preparationMethod` — applies frying/steaming multiplier to calories and fat
- pgvector hnsw iterative_scan not yet enabled — dietary-filtered vector search may underreturn on sparse categories
- GIN index on `dietaryFlags` JSONB not yet in schema — needs raw SQL migration (Prisma can't express jsonb_path_ops indexes)
- Next.js 16.2: caching is fully opt-in — all `fetch()` calls in Server Components must have explicit cache/revalidate options or they run fresh per request
- Prisma provider is already `"prisma-client"` (Prisma 7 migration done) — `compilerBuild = "fast"` not yet set
- Rate limiter uses atomic Redis Lua script (sliding window) — no race conditions under concurrency
- BullMQ queues have `removeOnComplete: 100` / `removeOnFail: 500` to prevent Redis memory bloat
- Evaluator `KNOWN_ALLERGEN_DISHES` map: dishes like Pad Thai claiming nut_free need 0.9+ confidence (not 0.85)
- Evaluator allergen keywords include singular AND plural forms ("peanut" + "peanuts")
- Allergens= code path applies same ALLERGY_CRITICAL_MIN confidence gate as dietary restrictions
- Orchestrator geo pre-filter: `getRestaurantIdsWithinRadius()` runs before Prisma query when lat/lng/radius provided
- Restaurant diversity cap: max 3 dishes per restaurant, preserves sort order (no interleaving)
- `next.config.ts` images: wildcard `**` pattern removed (was open proxy); AVIF format enabled
- Gemini vision uses `responseSchema` with `SchemaType` enum for guaranteed structured output
- Jest: `jose` is mocked via `__mocks__/jose.ts` + `moduleNameMapper` (ESM-only package)
- All API routes use `apiSuccess()`/`apiError()` envelope: `{ success: true, data: ... }` or `{ success: false, error: ... }`
- Tests must check `body.data.X` for success responses (not `body.X`)
