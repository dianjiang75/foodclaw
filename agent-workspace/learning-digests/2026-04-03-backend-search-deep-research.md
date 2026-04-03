# Backend & Search Deep Research Digest
**Date:** 2026-04-03
**Agent:** Backend & Search Research
**Topics:** pgvector iterative scan, FTS ranking, GIN/JSONB, BullMQ 5.x, Redis caching, pg_trgm, Prisma 7, Next.js 16 caching, geo queries, diversity ranking, semantic search

---

## Executive Summary

15 topics researched across Reddit, GitHub, AWS, Prisma, Redis, and pgvector documentation. Key findings with direct applicability to FoodClaw: (1) pgvector HNSW iterative scan (`relaxed_order`) is production-ready and critical for dietary-filtered vector search; (2) GIN index on `dietaryFlags` JSONB using `jsonb_path_ops` is a high-impact, low-risk migration; (3) Prisma 7.4 query caching (`compilerBuild = "fast"`) cuts per-query compilation from 0.1–1ms to 1–10µs; (4) FoodClaw's `fullTextSearchDishes` already uses `ts_rank_cd` correctly — the simple-dictionary fallback is an underappreciated strength; (5) BullMQ Flows are the right pattern for crawl → vision → USDA pipeline chains.

---

## Topic 1: pgvector 0.8 Iterative Scan for HNSW + Dietary Filters

### What Changed
pgvector 0.8.0 (late 2024) added iterative index scans. Before this, HNSW with `ef_search=40` on data where only 10% matches a dietary filter would return ~4 results (10% of 40 candidates). With iterative scan, pgvector loops deeper into the graph until enough post-filter results are found.

### Three Scan Modes
- `off` — default, legacy behavior; risks underreturning for sparse dietary filters
- `strict_order` — iterative scan preserving exact distance order; slower
- `relaxed_order` — iterative scan with approximate ordering; **recommended for production**

### Configuration (session-level or per-query)
```sql
-- Enable at session level for search queries
SET hnsw.iterative_scan = relaxed_order;

-- Set max tuples to scan (safety cap)
SET hnsw.max_scan_tuples = 10000;

-- Adjust candidate list size
SET hnsw.ef_search = 100;
```

### HNSW Index Creation Best Practice
```sql
CREATE INDEX dish_embedding_idx
ON dishes
USING hnsw (macro_embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64)
WHERE macro_embedding IS NOT NULL;
```

### FoodClaw Gap
`AGENTS.md` already notes: "pgvector hnsw iterative_scan not yet enabled — dietary-filtered vector search may underreturn on sparse categories." This is now fully fixable with a session-level SET before any vector query in the similarity engine.

### Performance Expectations
- Clarvo benchmark: 20+ seconds → under 10ms with proper HNSW + iterative scan
- Baseline target: 1–2ms for top 500 nearest neighbors on 1536-dim vectors if index fits in RAM
- Never accept >100ms for post-filtered vector queries

### Recommended Action (GREEN)
In `src/lib/similarity/index.ts`, add `SET hnsw.iterative_scan = relaxed_order` via `prisma.$executeRaw` before vector queries. Use partial HNSW indexes per dietary category for highest-traffic filters (vegan, gluten_free).

**Risk:** LOW | **Impact:** HIGH | **Effort:** LOW
**Target file:** `src/lib/similarity/index.ts`

---

## Topic 2: PostgreSQL Full-Text Search — ts_rank_cd vs ts_rank

### Current Status (GOOD)
FoodClaw already uses `ts_rank_cd(..., 2)` in `fullTextSearchDishes()`. This is the correct choice.

### Why ts_rank_cd is Right for Food Search
- `ts_rank_cd` (Cover Density) accounts for **proximity of matching lexemes**, not just frequency
- For multi-word dish queries like "spicy chicken bowl" or "pad see ew noodles", proximity matters
- The `2` normalization flag divides rank by document length — prevents long descriptions from dominating
- Default weights: A=1.0, B=0.4, C=0.2, D=0.1 (weight A for title, B for description is already the pattern in fallback)

### What's Missing: Weighted tsvector in Stored Column
The FTS fallback recalculates `setweight(to_tsvector(...), 'A')` on every query — expensive. The stored `search_vector` column (if it exists in post-migrate.sql) should be generated with field weights baked in:

```sql
ALTER TABLE dishes ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(category, '')), 'C')
  ) STORED;

CREATE INDEX idx_dishes_fts ON dishes USING GIN (search_vector);
```

### websearch_to_tsquery vs to_tsquery
The current code manually constructs `word & word` — this is fragile for quoted phrases and multi-word food terms. `websearch_to_tsquery` handles quotes, optional words, and exclusions natively:

```sql
-- Current (fragile — fails on single-word queries)
to_tsquery('english', 'spicy & chicken')

-- Better — handles "pad thai", 'chicken OR tofu', -nuts
websearch_to_tsquery('english', 'spicy chicken')
```

### Performance Tip
Always filter with `search_vector @@ query` BEFORE ranking. The WHERE clause should run on the GIN index; `ts_rank_cd` is applied only on the matched subset.

### Recommended Action (GREEN)
1. Add `websearch_to_tsquery` as primary query builder in `fullTextSearchDishes()` with `to_tsquery` as fallback
2. Confirm `search_vector` stored column has `setweight` for name (A) and description (B) in post-migrate.sql
3. Add `category` as weight C to the generated tsvector — enables "show me vegan thai" to score on category

**Risk:** LOW | **Impact:** MEDIUM | **Effort:** LOW
**Target file:** `src/lib/db/geo.ts`

---

## Topic 3: GIN Index on dietaryFlags JSONB

### Current Gap
`AGENTS.md` explicitly notes: "GIN index on `dietaryFlags` JSONB not yet in schema — needs raw SQL migration (Prisma can't express jsonb_path_ops indexes)."

### The Fix
```sql
-- Use jsonb_path_ops (not default jsonb_ops) — smaller index, faster for @> queries
CREATE INDEX CONCURRENTLY idx_dishes_dietary_flags
ON dishes
USING GIN (dietary_flags jsonb_path_ops);
```

### Why jsonb_path_ops over jsonb_ops
- 36x smaller index in benchmarks
- Optimized exclusively for containment (`@>`) queries
- FoodClaw's dietary filter uses Prisma's `{ path: [key], equals: true }` which translates to `@>` containment — perfect fit
- Tradeoff: does NOT support key existence (`?`) queries, but FoodClaw doesn't use those

### Performance Benchmark
- Without GIN: sequential scan on `dietaryFlags` JSONB → ~215ms on 1M rows
- With GIN (`jsonb_path_ops`): index scan → sub-millisecond for high-selectivity flags

### Write Performance Note
GIN indexes have higher write overhead than B-tree. For FoodClaw's write pattern (menu crawl inserts, rare updates), this is acceptable. Use `CREATE INDEX CONCURRENTLY` to avoid table lock during migration.

### Recommended Action (GREEN — needs raw SQL migration)
Add to post-migrate.sql:
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dishes_dietary_flags
ON dishes USING GIN (dietary_flags jsonb_path_ops);
```

**Risk:** LOW (CONCURRENTLY) | **Impact:** HIGH | **Effort:** LOW
**Target file:** `prisma/post-migrate.sql` (create if not exists), `prisma/migrations/`

---

## Topic 4: BullMQ 5.x — Flows, Priorities, and Pipeline Architecture

### BullMQ Flows for Crawl → Vision → USDA Pipeline
The current pipeline (crawl → photo analysis → vision → USDA matching) is a perfect use case for BullMQ Flows. Flows provide parent-child job hierarchies where a parent waits for all children before executing.

```typescript
import { FlowProducer } from 'bullmq';

const flow = new FlowProducer({ connection: redisConnection });

// Parent: nutrition-resolver waits for vision to complete
await flow.add({
  name: 'resolve-nutrition',
  queueName: 'nutrition-queue',
  data: { restaurantId, dishId },
  children: [
    {
      name: 'analyze-photos',
      queueName: 'vision-queue',
      data: { dishId, photoUrls },
      children: [
        {
          name: 'crawl-menu',
          queueName: 'crawl-queue',
          data: { googlePlaceId },
        }
      ]
    }
  ]
});
```

### Priority Tiers for FoodClaw
Recommended priority framework:
- `1` — Critical: user-triggered crawl (someone just searched for a restaurant with no data)
- `2` — High: photo re-analysis after user feedback
- `5` — Normal: scheduled nightly crawl batch
- `10` — Low: USDA synonym expansion, review aggregation
- `20` — Background: bulk re-crawl of stale menus

### Priority Aging (Anti-Starvation)
Jobs in low-priority tiers can starve. Implement a periodic priority boost for old jobs:
```typescript
// Boost jobs waiting > 5 minutes (run on scheduler)
const waitingJobs = await queue.getWaiting();
for (const job of waitingJobs) {
  if (Date.now() - job.timestamp > 5 * 60 * 1000) {
    await job.changePriority({ priority: Math.max(1, (job.opts.priority ?? 10) - 1) });
  }
}
```

### Multi-Queue Worker Ratios
For FoodClaw's nightly automation:
```
crawl-queue: concurrency 5 (IO-bound: web scraping)
vision-queue: concurrency 3 (already set; AI rate limits)
usda-queue: concurrency 10 (IO-bound: USDA API calls)
review-queue: concurrency 5 (IO-bound: Google/Yelp)
```

### Dynamic Concurrency
Worker concurrency can be updated at runtime without restart:
```typescript
// Reduce during peak web traffic hours
worker.concurrency = 2;
// Increase during nightly batch
worker.concurrency = 10;
```

### Key Constraint
JobIds cannot contain colons (`:`). The current pattern `crawl-${googlePlaceId}` and `photo-${dishId}` is safe since UUIDs don't contain colons.

**Risk:** LOW | **Impact:** MEDIUM | **Effort:** MEDIUM
**Target file:** `src/workers/` (flow integration)

---

## Topic 5: Redis Semantic Caching for Search

### Current Implementation
FoodClaw uses exact-match Redis cache with SHA-256 hash of all query params (`query:{hash}`). This is correct for exact repeat queries but misses semantically similar queries.

### Semantic Cache Layer
The current cache already handles exact hits well. To add semantic similarity:

**Two-level cache architecture:**
1. Level 1: Exact match (current SHA-256 hash) — O(1) lookup
2. Level 2: Semantic similarity — vector comparison against recent query embeddings

For Level 2, use Redis vector sets (new in Spring 2025):
```typescript
// On cache miss: store query embedding
await redis.call('VADD', 'query-cache', 'FP32', embeddingBuffer, queryHash);

// On new query: find similar past queries
const similar = await redis.call('VSIM', 'query-cache', 'FP32', newEmbeddingBuffer, 'COUNT', 5);
```

### Similarity Threshold Recommendation
- Start at `0.92` similarity threshold (conservative — avoids wrong cached results for safety-critical dietary queries)
- For Allergy Alice (nut_free + gluten_free): **never serve cached results from different dietary restriction combos** — add dietary hash as a hard cache partition key
- For non-allergy queries: `0.88–0.92` threshold acceptable

### TTL Recommendations for FoodClaw
| Data Type | TTL |
|-----------|-----|
| Search results (geo + dietary) | 15 minutes |
| Restaurant logistics (wait times) | 5 minutes |
| Menu data (dish details) | 4 hours |
| Review summaries | 24 hours |
| USDA nutrition matches | 7 days |

### Content-Triggered Invalidation
After menu crawl completes for a restaurant, invalidate all cache keys that include that restaurantId:
```typescript
// On crawl complete: publish invalidation event
await redis.publish('cache:invalidate', JSON.stringify({
  type: 'restaurant',
  restaurantId: googlePlaceId
}));

// Cache subscriber: delete matching keys
redis.subscribe('cache:invalidate', async (message) => {
  const { type, restaurantId } = JSON.parse(message);
  if (type === 'restaurant') {
    // Pattern delete all search caches that could include this restaurant
    // Use Redis SCAN + DEL pattern for query:{hash} keys
  }
});
```

**Risk:** MEDIUM (semantic cache is new infra) | **Impact:** HIGH | **Effort:** MEDIUM
**Target file:** `src/lib/cache/index.ts`

---

## Topic 6: pg_trgm Fuzzy Search and Typo Tolerance

### Current Usage
`findDishesByNameSimilarity()` in `geo.ts` already uses `similarity(d.name, name) > 0.2` — this is correct for dish recognition from photo analysis.

### Improvements Available

**GiST vs GIN for trigrams:**
On large datasets (>1M rows), GiST indexes can outperform GIN significantly for similarity searches. Real benchmark: GiST 4s vs GIN 90s on 25M rows. For FoodClaw's scale (thousands of dishes), either works.

```sql
-- Current (no index) — add one:
CREATE INDEX idx_dishes_name_trgm ON dishes USING GIN (name gin_trgm_ops);
-- OR for larger scale:
CREATE INDEX idx_dishes_name_trgm ON dishes USING GIST (name gist_trgm_ops);
```

**Similarity threshold for food search:**
- `0.2` (current) — catches "sush" → "sushi", good for typo tolerance
- `0.3` — tighter, fewer false positives for disambiguation
- For "pad thai" type searches: similarity works well because multi-word food names have many shared trigrams

**Combined FTS + trgm for search fallback chain:**
1. `websearch_to_tsquery` on `search_vector` (fast, semantic)
2. `similarity()` on `name` with `> 0.25` (catches typos in FTS miss)
3. ILIKE `%query%` (last resort)

**Risk:** LOW | **Impact:** MEDIUM | **Effort:** LOW
**Target file:** `src/lib/db/geo.ts`, `prisma/post-migrate.sql`

---

## Topic 7: Prisma 7 Performance Optimizations

### Architecture Change (Already Migrated)
`AGENTS.md` confirms: "Prisma provider is already `prisma-client` (Prisma 7 migration done)". The Rust engine has been replaced by TypeScript/WASM.

### Critical Gap: compilerBuild = "fast"
`AGENTS.md` notes: "`compilerBuild = 'fast'` not yet set." This is a significant omission.

In Prisma 7, WASM moves compilation to the main JS event loop. Without `compilerBuild = "fast"`, each query incurs 0.1–1ms compilation overhead. With it, v7.4 query caching reduces this to 1–10µs.

```prisma
generator client {
  provider        = "prisma-client"
  output          = "../src/generated/prisma"
  previewFeatures = ["postgresqlExtensions"]
  compilerBuild   = "fast"    // ADD THIS
}
```

### v7.4 Query Caching (Available Now)
Once `compilerBuild = "fast"` is set, Prisma caches compiled query plans. Subsequent identical queries reuse the template — nearly zero compilation overhead. This benefits FoodClaw's search path heavily since `prisma.dish.findMany()` with similar structure runs repeatedly.

### Scaling Fix for WASM on Main Thread
Prisma 7 WASM runs on the main JS event loop. Under high concurrency, compilation accumulates. Fix: use Node.js `cluster` module or PM2 cluster mode to distribute across CPU cores. Each worker gets its own WASM instance.

### Partial Indexes (Preview — Available in v7+)
```prisma
@@index([isAvailable], where: { isAvailable: true })  // Only index available dishes
```
This reduces index size and speeds up the `isAvailable = true` filter that appears in every search query.

**Risk:** LOW | **Impact:** MEDIUM-HIGH | **Effort:** VERY LOW
**Target file:** `prisma/schema.prisma` (add `compilerBuild = "fast"`)

---

## Topic 8: Next.js 16 Caching — use cache Directive

### Breaking Change (Already Noted in AGENTS.md)
"Next.js 16.2: caching is fully opt-in — all `fetch()` calls in Server Components must have explicit cache/revalidate options or they run fresh per request."

### New `use cache` Directive Pattern
```typescript
// Cache a Server Component's data fetch
async function SearchResults({ params }) {
  'use cache';
  // This is now cached — persists across requests
  const results = await getSearchResults(params);
  return <ResultsList results={results} />;
}

// With custom TTL
import { unstable_cacheLife } from 'next/cache';
async function DishDetail({ dishId }) {
  'use cache';
  unstable_cacheLife('hours'); // Cache for 1 hour
  const dish = await getDish(dishId);
  return <DishCard dish={dish} />;
}
```

### Cache Invalidation with Tags
```typescript
// Tag a cached resource
import { unstable_cacheTag } from 'next/cache';
async function getRestaurantData(id: string) {
  'use cache';
  unstable_cacheTag(`restaurant:${id}`);
  return prisma.restaurant.findUnique({ where: { id } });
}

// Invalidate on crawl completion (Server Action)
'use server';
import { revalidateTag } from 'next/cache';
export async function onCrawlComplete(restaurantId: string) {
  revalidateTag(`restaurant:${restaurantId}`);
}
```

### Recommended Cache Durations for FoodClaw Pages
| Page/Component | Strategy |
|----------------|----------|
| Dish detail page | `use cache` + `unstable_cacheLife('hours')` |
| Search results | No cache (dynamic, per-user) |
| Restaurant info | `use cache` + `unstable_cacheTag('restaurant:{id}')` |
| Category browse | `use cache` + 1 hour revalidate |
| User profile | No cache (private) |

**Risk:** LOW | **Impact:** MEDIUM | **Effort:** LOW
**Target files:** `src/app/dish/[id]/page.tsx`, `src/app/restaurant/[id]/page.tsx`

---

## Topic 9: PostgreSQL Geo Queries — earthdistance vs PostGIS

### Current Implementation
FoodClaw uses `earthdistance` with `earth_box()` + `ll_to_earth()` in `geo.ts`. This is correct and working.

### earthdistance vs PostGIS Trade-offs
| Feature | earthdistance (current) | PostGIS |
|---------|------------------------|---------|
| Accuracy | ~1–3m error at 50° lat | WGS84 ellipsoid (GPS-grade) |
| Index support | GIST on `ll_to_earth()` expression | `ST_DWithin` uses GIST/BRIN on geography |
| Query speed | ~3ms with index | ~3ms with index (similar) |
| Setup complexity | Already installed | Requires PostGIS extension |
| Dependency | Lightweight (cube + earthdistance) | Full PostGIS (~100MB) |

### Verdict: Keep earthdistance
For FoodClaw's use case (city-level radius queries, 1–5 mile radius), earthdistance's 1–3 meter error is completely irrelevant. PostGIS provides no meaningful benefit and adds significant dependency weight. The current implementation is correct.

### One Optimization: Expression Index
If not already present, ensure this index exists:
```sql
-- Expression index on ll_to_earth for restaurants table
CREATE INDEX idx_restaurants_geo
ON restaurants
USING gist(ll_to_earth(latitude::float, longitude::float));
```
Without this, `earth_box() @>` does a sequential scan. With it, the geo pre-filter runs in ~1ms.

**Risk:** N/A | **Impact:** HIGH if index missing | **Effort:** LOW
**Target file:** `prisma/post-migrate.sql`

---

## Topic 10: Search Result Diversity Ranking

### Current Implementation
FoodClaw's diversity cap (max 3 dishes per restaurant) is a hard filter, not a ranking signal. This is a good starting point.

### What Food/Restaurant Platforms Do (2025)
Modern food discovery ranking factors (from delivery platform analysis):
1. **Recent activity signals** — restaurants with reviews in last 60 days outrank those with 400 reviews over 5 years
2. **Operational reliability** — going offline even briefly drops ranking
3. **Attribute diversity** — platforms favor restaurants with complete, accurate dietary/nutritional data
4. **Geographic clustering** — migrant cuisines in peripheral areas systematically underrank

### Improvements for FoodClaw's Relevance Score

**Current `relevanceScore()` function gaps:**
1. FTS rank is normalized to [0,1] but `ts_rank_cd` can exceed 1.0 for high-density matches — use `Math.min(ftsRank * 2, 1)` for better spread
2. No recency signal — a dish added yesterday with good data should rank higher than stale data
3. No photo quality signal — `hasPhoto` is binary; a dish with 3 photos should score higher than 1

**Improved scoring additions:**
```typescript
// Add recency signal (half-life ~30 days)
const daysSinceVerified = dish.lastVerified
  ? (Date.now() - new Date(dish.lastVerified).getTime()) / (1000 * 60 * 60 * 24)
  : 90;
const recencyScore = Math.exp(-daysSinceVerified / 30); // 0-1, decays over time

// Add to relevanceScore:
recencyScore * 0.05  // 5% weight
```

**Risk:** LOW | **Impact:** MEDIUM | **Effort:** LOW
**Target file:** `src/lib/orchestrator/index.ts` (relevanceScore function)

---

## Topic 11: BullMQ Worker Concurrency Auto-Scaling

### Current Setup
Workers use `CONCURRENCY=3` for vision batch analysis. This is conservative for IO-bound work.

### Recommended Concurrency by Job Type
```typescript
// Crawl workers (network IO — can be high)
const crawlWorker = new Worker('crawl-queue', crawlHandler, {
  connection: redisConnection,
  concurrency: 10,  // Network IO bound
});

// Vision workers (Gemini API — rate limited)
const visionWorker = new Worker('vision-queue', visionHandler, {
  connection: redisConnection,
  concurrency: 3,  // Keep at 3 — Gemini rate limits
});

// USDA workers (HTTP API — moderate)
const usdaWorker = new Worker('usda-queue', usdaHandler, {
  connection: redisConnection,
  concurrency: 8,
});
```

### Horizontal Scaling Pattern
For nightly batch (runs 2 AM), spin up additional worker processes:
```typescript
// Each process handles a subset of work
// Redis coordinates — no job duplication guaranteed by BullMQ
if (process.env.WORKER_ROLE === 'crawl') {
  new Worker('crawl-queue', crawlHandler, { concurrency: 15 });
}
```

### Global Concurrency for Rate-Limited APIs
BullMQ Pro feature `globalConcurrency` limits total concurrent jobs across all workers for a queue. Without Pro, use a Redis-based semaphore:
```typescript
// Semaphore pattern for Google Places API (rate limit: 100 req/s)
const MAX_CONCURRENT_PLACES = 50;
const semaphore = new Semaphore(redis, 'google-places', MAX_CONCURRENT_PLACES);
```

**Risk:** LOW | **Impact:** MEDIUM | **Effort:** LOW
**Target file:** `src/workers/`

---

## Topic 12: Redis Cache Invalidation Patterns

### Current Pattern
TTL-based expiration (implicit from `setCachedQuery`). Content-triggered invalidation is not yet implemented.

### Event-Driven Invalidation Architecture
```typescript
// After menu crawl completes, invalidate stale search caches
// In menu-crawler worker:
await redis.publish('cache:restaurant-updated', restaurantId);

// In a cache subscriber (separate process or same server):
redis.subscribe('cache:restaurant-updated');
redis.on('message', async (channel, restaurantId) => {
  if (channel === 'cache:restaurant-updated') {
    // Scan and delete query caches that referenced this restaurant
    // Use Redis SCAN to avoid blocking:
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', 'query:*', 'COUNT', 100);
      cursor = nextCursor;
      // For each key, check if it references the restaurant (stored in value or separate index)
    } while (cursor !== '0');
  }
});
```

### Recommended: Tag-Based Cache Index
Instead of scanning all keys, maintain a reverse index:
```typescript
// When storing a search result, also record which restaurants it includes
await redis.sadd(`restaurant-cache-refs:${restaurantId}`, cacheKey);
await redis.expire(`restaurant-cache-refs:${restaurantId}`, 3600);

// On restaurant update, invalidate all referencing cache entries
const refs = await redis.smembers(`restaurant-cache-refs:${restaurantId}`);
if (refs.length > 0) {
  await redis.del(...refs);
  await redis.del(`restaurant-cache-refs:${restaurantId}`);
}
```

**Risk:** LOW | **Impact:** MEDIUM | **Effort:** MEDIUM
**Target file:** `src/lib/cache/index.ts`

---

## Topic 13: pgvector + GIN Hybrid Search Pattern

### The Core Challenge
PostgreSQL cannot efficiently combine HNSW vector index and GIN JSONB index in a single query plan. The two indexes are used independently.

### Recommended Hybrid Pattern (RAG 2.0 / Two-Stage Retrieval)
```sql
-- Stage 1: GIN pre-filter on dietary flags (fast, exact)
WITH dietary_candidates AS (
  SELECT id, macro_embedding
  FROM dishes
  WHERE dietary_flags @> '{"vegan": true}'::jsonb
    AND is_available = true
),
-- Stage 2: ANN vector search within pre-filtered set
vector_ranked AS (
  SELECT id,
         macro_embedding <=> $1::vector AS distance
  FROM dietary_candidates
  ORDER BY distance
  LIMIT 40
)
-- Final: apply iterative scan handles the sparse-filter underreturn
SELECT * FROM vector_ranked;
```

### Partial HNSW Indexes per Dietary Flag
For high-traffic dietary categories, create dedicated partial indexes:
```sql
-- Vegan-only HNSW index (smaller, faster for vegan queries)
CREATE INDEX dish_vegan_embedding_idx
ON dishes
USING hnsw (macro_embedding vector_cosine_ops)
WHERE (dietary_flags @> '{"vegan": true}')
  AND macro_embedding IS NOT NULL;
```

The query planner will automatically use the partial index when the WHERE clause matches.

**Risk:** LOW | **Impact:** HIGH | **Effort:** MEDIUM
**Target files:** `prisma/post-migrate.sql`, `src/lib/similarity/index.ts`

---

## Topic 14: EXPLAIN ANALYZE Best Practices

### For FoodClaw Query Optimization
Always run with `BUFFERS` to see cache hit rates:
```sql
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, COSTS, TIMING)
SELECT id, ts_rank_cd(search_vector, q) AS rank
FROM dishes, websearch_to_tsquery('english', 'spicy chicken') q
WHERE search_vector @@ q
  AND is_available = true
ORDER BY rank DESC
LIMIT 50;
```

### Key Signals to Watch
- **Seq Scan instead of Index Scan**: Missing or unused index — check `pg_stat_user_indexes`
- **Rows estimate vs actual**: Large discrepancy means stale statistics — run `ANALYZE dishes`
- **Buffers: shared hit vs read**: Low hit ratio means index/data not in `shared_buffers` — increase `shared_buffers` or `effective_cache_size`

### Slow Query Logging
Add to PostgreSQL config:
```
log_min_duration_statement = 100  # Log queries >100ms
log_lock_waits = on
```

Then route slow queries to a monitoring file for the nightly agent to analyze.

**Risk:** N/A | **Impact:** HIGH (diagnostic) | **Effort:** LOW

---

## Topic 15: Semantic Search with Food Embeddings

### Current State
FoodClaw has `macro_embedding` on dishes (pgvector). The embedding model and generation pipeline are in `src/lib/similarity/`.

### What's Working in Production (2025)
Cross-modal food embeddings (text + image) using:
- `text-embedding-3-small` (OpenAI) or equivalent for dish descriptions
- Sentence transformers fine-tuned on food/nutrition corpora
- Recipe1M+ dataset embeddings for semantic food understanding

### Recommended Embedding Strategy for FoodClaw
1. **Query embedding**: Use the same model as dish embeddings — model consistency is critical
2. **Field weighting in embeddings**: Concatenate `name + " " + category + " " + ingredients` for richer semantic representation than name alone
3. **Nutrition-aware embeddings**: Include macro ranges in the text before embedding: `"${name} ${description} high protein low carb"` — this makes semantic search macro-aware

### Hybrid Search RRF (Reciprocal Rank Fusion) Implementation
Combining FTS + vector search with RRF for best results:
```sql
SELECT
  searches.id,
  SUM(1.0 / (searches.rank_pos + 60)) AS rrf_score  -- k=60 is standard
FROM (
  -- FTS branch
  (SELECT id, RANK() OVER (ORDER BY ts_rank_cd(search_vector, q) DESC) AS rank_pos
   FROM dishes, websearch_to_tsquery('english', $1) q
   WHERE search_vector @@ q AND is_available = true
   ORDER BY rank_pos LIMIT 40)
  UNION ALL
  -- Vector branch
  (SELECT id, RANK() OVER (ORDER BY macro_embedding <=> $2::vector) AS rank_pos
   FROM dishes
   WHERE is_available = true
   ORDER BY rank_pos LIMIT 40)
) searches
GROUP BY searches.id
ORDER BY rrf_score DESC
LIMIT 20;
```

This approach outperforms either method alone and handles the case where a dish name matches FTS but not vector (or vice versa).

**Risk:** MEDIUM (new search path) | **Impact:** HIGH | **Effort:** HIGH
**Target files:** `src/lib/similarity/index.ts`, `src/lib/orchestrator/index.ts`

---

## Priority Action Matrix

| # | Action | Risk | Impact | Effort | Target File |
|---|--------|------|--------|--------|-------------|
| 1 | Add `compilerBuild = "fast"` to Prisma schema | GREEN | HIGH | VERY LOW | `prisma/schema.prisma` |
| 2 | GIN index on `dietaryFlags` JSONB (jsonb_path_ops) | GREEN | HIGH | LOW | `prisma/post-migrate.sql` |
| 3 | HNSW iterative scan (`relaxed_order`) in similarity queries | GREEN | HIGH | LOW | `src/lib/similarity/index.ts` |
| 4 | Expression GiST index on `ll_to_earth()` for restaurants | GREEN | HIGH | LOW | `prisma/post-migrate.sql` |
| 5 | `websearch_to_tsquery` in `fullTextSearchDishes()` | GREEN | MEDIUM | LOW | `src/lib/db/geo.ts` |
| 6 | GIN trgm index on `dishes.name` | GREEN | MEDIUM | LOW | `prisma/post-migrate.sql` |
| 7 | Add `category` as weight C to `search_vector` generated column | GREEN | MEDIUM | LOW | `prisma/post-migrate.sql` |
| 8 | Tag-based Redis cache invalidation on crawl complete | YELLOW | MEDIUM | MEDIUM | `src/lib/cache/index.ts` |
| 9 | `use cache` directive on dish detail / restaurant pages | GREEN | MEDIUM | LOW | `src/app/**` |
| 10 | Recency signal in `relevanceScore()` function | GREEN | MEDIUM | LOW | `src/lib/orchestrator/index.ts` |
| 11 | BullMQ Flows for crawl → vision → USDA pipeline | YELLOW | MEDIUM | MEDIUM | `src/workers/` |
| 12 | Partial HNSW indexes per dietary category (vegan, gluten_free) | YELLOW | HIGH | MEDIUM | `prisma/post-migrate.sql` |
| 13 | RRF hybrid search combining FTS + vector | YELLOW | HIGH | HIGH | `src/lib/similarity/`, orchestrator |

---

## Outdated Patterns to Avoid

| Pattern | Status | Replace With |
|---------|--------|-------------|
| `to_tsquery()` with manual `&` join | Fragile | `websearch_to_tsquery()` |
| `jsonb_ops` GIN index (default) | Suboptimal | `jsonb_path_ops` for containment queries |
| Haversine in JS for all dishes | Done (earthdistance pre-filter exists) | Keep current |
| pgvector HNSW without iterative_scan | Known gap | `SET hnsw.iterative_scan = relaxed_order` |
| Prisma 7 without `compilerBuild = "fast"` | Known gap | Add to `generator` block |
| Full-page caching in Next.js (automatic) | Removed in v16 | Explicit `use cache` directive |
| ILIKE for all text search | Fallback only | Primary: FTS, Secondary: trgm similarity |

---

## Sources Referenced
- pgvector 0.8.0 release notes and iterative scan documentation
- AWS Aurora PostgreSQL pgvector 0.8.0 blog
- Clarvo: optimizing filtered vector queries (20s → 10ms)
- Jonathan Katz: hybrid search with pgvector (RRF patterns)
- Prisma v7.4 performance benchmarks and query caching announcement
- Redis semantic caching documentation and LangCache announcement
- BullMQ Flows documentation, priority patterns guide
- Xata: advanced PostgreSQL FTS engine patterns
- Leapcell: PostgreSQL FTS optimization
- Modexa: 10 pgvector index patterns for RAG 2.0
- Vedant Thakkar: GIN indexes for JSONB (36x size comparison)
- Next.js 16 `use cache` directive documentation
- earthdistance vs PostGIS comparison (Hashrocket, Elephant Tamer)
