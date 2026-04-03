# FoodClaw Learning Digest: Backend -- Cycle 4
**Date**: 2026-04-02
**Agent**: Backend (PostgreSQL, pgvector, Redis, Prisma, connection pooling, query optimization, full-text search)

---

## CURRENT STATE ASSESSMENT

### Codebase Snapshot
- **Prisma**: v7.6.0 with `@prisma/adapter-pg` (PrismaPg adapter using `pg` pool)
- **Redis**: ioredis 5.10.1, cache-aside pattern, TTL-segmented by domain
- **pgvector**: 4-dimensional macro_embedding with HNSW index (m=8, ef_construction=32)
- **Full-text search**: English tsvector generated column + GIN index, with JS fallback to `simple` dictionary for foreign food terms
- **Connection pooling**: PrismaPg with configurable max pool (default 10), idle timeout 30s
- **Geo queries**: earthdistance extension with GIST index on ll_to_earth()
- **BullMQ**: v5.71.1 for crawl/photo worker queues

### Open Backend Issues from Backlog (CRITICAL/MAJOR)
1. **CRITICAL**: calorie_limit=500 shows 806-cal dishes -- regression in orchestrator filtering (already addressed in cycle 3 fix log but re-appeared)
2. **CRITICAL**: allergens= code path skips ALLERGY_CRITICAL_MIN confidence gate
3. **MAJOR**: Protein sort non-monotonic at tail (restaurant grouping artifact)
4. **MAJOR**: protein_min filter uses protein_max_g not protein_min_g
5. **MAJOR**: max_wait=15 leaks dish at 16 min (off-by-one)
6. **MAJOR**: Similar dishes returns empty array -- vector search broken
7. **MAJOR**: Rating sort breaks at position 16

Note: Items 3-5 were addressed in the 2026-04-02 learning cycle log (phase 4). Item 6 (vector search broken) is the most backend-relevant remaining issue.

---

## KEY FINDINGS

### 1. pgvector Iterative Scans Not Enabled -- Silent Result Degradation

**Source**: [pgvector 0.8.0 release notes](https://www.postgresql.org/about/news/pgvector-080-released-2952/) | [AWS guide on pgvector 0.8.0](https://aws.amazon.com/blogs/database/supercharging-vector-search-performance-and-relevance-with-pgvector-0-8-0-on-amazon-aurora-postgresql/)

**Finding**: The similarity search in `src/lib/similarity/index.ts` runs a `<=>` cosine distance query with dietary and geo WHERE clauses. Without `hnsw.iterative_scan = 'relaxed_order'`, pgvector stops scanning after finding the top-k candidates from the HNSW index, then applies WHERE filters post-scan. For sparse dietary categories (kosher, halal, vegan), this silently returns fewer results than requested -- sometimes zero. This directly explains the MAJOR backlog issue "Similar dishes returns empty array for top dishes."

**Current code** (`src/lib/similarity/index.ts` lines 102-134): The vector query applies `d.is_available = true AND r.is_active = true AND d.macro_embedding IS NOT NULL AND earth_box(...)` as WHERE clauses that all execute after the HNSW index scan. No iterative scan settings are set.

**Gap**: No `SET hnsw.iterative_scan` or `SET hnsw.max_scan_tuples` anywhere in the codebase. Confirmed via grep -- zero matches.

---

### 2. HNSW Index Parameters Under-tuned for FoodClaw Dataset

**Source**: [Crunchy Data HNSW guide](https://www.crunchydata.com/blog/hnsw-indexes-with-postgres-and-pgvector) | [Google Cloud pgvector tuning](https://cloud.google.com/blog/products/databases/faster-similarity-search-performance-with-pgvector-indexes/) | [Neon pgvector optimization](https://neon.com/docs/ai/ai-vector-search-optimization)

**Finding**: The current HNSW index uses `m = 8, ef_construction = 32` (from `post-migrate.sql` line 49). The pgvector default is `m = 16, ef_construction = 64`. The recommended rule of thumb is `ef_construction >= 2 * m`. Our values are at the low end, which trades recall for build speed -- but for a small dataset (~87-200 dishes), build speed is irrelevant and recall matters greatly. With only 4-dimensional vectors (calories, protein, carbs, fat), the HNSW graph connectivity at m=8 may be insufficient for good recall on filtered queries.

**Recommended**: For a small dataset with low-dimensional vectors, `m = 16, ef_construction = 64` (pgvector defaults) would provide better recall with negligible build-time cost. Also raise `hnsw.ef_search` from default 40 to 100 for query-time recall.

---

### 3. Simple tsvector Column for Foreign Food Terms (Deferred YELLOW Item)

**Source**: [PostgreSQL multilingual FTS](https://emplocity.com/en/about-us/blog/how_to_build_postgresql_full_text_search_engine_in_any_language/) | [PostgreSQL FTS docs](https://www.postgresql.org/docs/current/textsearch-intro.html)

**Finding**: The current full-text search in `src/lib/db/geo.ts` (lines 54-103) uses a two-pass approach: first query the English `search_vector` generated column, then if zero results, fall back to computing `to_tsvector('simple', ...)` on the fly. The fallback works but is slow -- it computes tsvector per-row at query time instead of using a pre-computed indexed column.

**Current gap**: The `post-migrate.sql` only creates an English-dictionary generated column. There is no `simple`-dictionary tsvector column, so the fallback in `geo.ts` lines 84-99 does a sequential scan with on-the-fly tsvector computation. For foreign food terms like "udon", "ramen", "bibimbap", "pho", "banh mi", the English stemmer either drops them entirely or mishandles them.

**Recommendation**: Add a second generated column `search_vector_simple` using the `simple` dictionary in `post-migrate.sql`, with a GIN index. Then modify `fullTextSearchDishes()` to query both columns in a single UNION query, weighting English results higher than simple matches. This eliminates the sequential scan fallback.

---

### 4. Prisma 7 Query Plan Caching Already Available

**Source**: [Prisma 7.4 release blog](https://www.prisma.io/blog/prisma-orm-v7-4-query-caching-partial-indexes-and-major-performance-improvements) | [Prisma 7 AMA](https://www.prisma.io/blog/prisma-7-ama-clearing-up-the-why-behind-the-changes)

**Finding**: FoodClaw is on Prisma 7.6.0, which includes the query plan caching introduced in 7.4.0. This caches compiled query plans in an LRU cache, reusing them across repeated queries with the same shape. This is already active by default -- no configuration needed. The main search query in `orchestrator/index.ts` (line 145, `prisma.dish.findMany(...)`) benefits automatically since search queries have a consistent shape with varying parameter values.

**Action needed**: None for enabling caching. However, the orchestrator uses `$queryRaw` for full-text search and vector similarity -- these bypass Prisma's query plan cache. The raw queries are fine since they are parameterized SQL that PostgreSQL caches via prepared statements.

---

### 5. Redis Cache Strategy Review

**Source**: [Redis cache optimization guide](https://redis.io/blog/guide-to-cache-optimization-strategies/) | [Redis 8 GA](https://redis.io/blog/redis-8-ga/)

**Finding**: The current cache implementation in `src/lib/cache/index.ts` uses a well-structured cache-aside pattern with domain-segmented TTLs. The query cache key generation (`buildQueryCacheKey`) is comprehensive, including search text, dietary filters, geo coordinates (rounded to 3 decimal places), sort, calorie limit, protein min, and allergens. This is solid.

**Gaps identified**:
- **No cache warming**: The first user in a new geo area always gets a cold cache. For a food app with predictable lunch/dinner peaks, prefetching popular queries at 11:00 AM and 5:00 PM could pre-warm the cache.
- **No hit/miss metrics**: There is no tracking of cache hit ratio. The `logger.debug("Search cache hit")` in the orchestrator logs hits but no misses are logged. Without metrics, there is no way to know if the 5-minute QUERY TTL is appropriate.
- **Stale-while-revalidate not implemented**: When a cached query expires, the next user gets a full DB query. A background refresh pattern (return stale, trigger async refresh) would keep latency consistent during peak hours.

---

### 6. Connection Pool Size and Idle Timeout

**Source**: [PgBouncer best practices](https://www.percona.com/blog/pgbouncer-for-postgresql-how-connection-pooling-solves-enterprise-slowdowns/) | [Heroku PgBouncer guide](https://devcenter.heroku.com/articles/best-practices-pgbouncer-configuration)

**Finding**: The current pool configuration in `src/lib/db/client.ts` uses `max: parseInt(process.env.DB_POOL_MAX || "10", 10)` with `idleTimeoutMillis: 30000`. For a Next.js serverless deployment, 10 is a reasonable default. However:

- **No min pool**: The `pg` pool defaults to `min: 0`, meaning connections are torn down after idle. For a food app with consistent traffic, setting `min: 2` keeps warm connections available.
- **connectionTimeoutMillis: 10000** (10 seconds) is very high for a local/managed DB. A 3-5 second timeout would surface connection issues faster.
- **No pool error handling**: The PrismaPg adapter doesn't expose pool events. Consider adding `pool.on('error', ...)` if using the raw `pg.Pool` directly, though the PrismaPg adapter abstracts this.

---

### 7. PostgreSQL 17 Performance Features Relevant to FoodClaw

**Source**: [PostgreSQL 17 release](https://www.postgresql.org/about/news/postgresql-17-released-2936/) | [PgEdge analysis](https://www.pgedge.com/blog/postgresql-17-a-major-step-forward-in-performance-logical-replication-and-more)

**Finding**: PG17 brings several improvements relevant to FoodClaw:
- **IN clause B-tree optimization**: The orchestrator's `id: { in: textSearchDishIds }` and `restaurantId: { in: nearbyRestaurantIds }` queries benefit from faster IN-list processing with B-tree indexes.
- **Improved VACUUM**: 20x less memory usage for vacuum operations. Relevant as the dataset grows.
- **Streaming I/O for sequential scans**: The full-text search fallback (simple dictionary path) benefits from faster seq scans.

**Action needed**: Verify the PostgreSQL version being used. If on PG16 or earlier, upgrading to PG17 is a worthwhile YELLOW-tier effort.

---

### 8. GIN Index on dietaryFlags Still Missing

**Source**: [2026-04-01 backend improvement log](file://agent-workspace/improvement-logs/2026-04-01-backend.md) | [2026-04-02 comprehensive digest item #10](file://agent-workspace/learning-digests/2026-04-02-comprehensive.md)

**Finding**: Previously flagged on 2026-04-01 and again on 2026-04-02. The `post-migrate.sql` already has `CREATE INDEX IF NOT EXISTS idx_dishes_dietary ON dishes USING GIN(dietary_flags jsonb_path_ops);` (line 22-23). However, the Prisma orchestrator uses `dietaryFlags: { path: [key], equals: true }` syntax (orchestrator line 353), which Prisma translates to a JSON path query. The `jsonb_path_ops` GIN index supports `@>` containment queries but NOT path-based equality checks.

**Gap**: Prisma's `{ path: [key], equals: true }` likely generates SQL like `dietary_flags->'vegan' = 'true'` which does NOT use the `jsonb_path_ops` GIN index. The query would need to use `dietary_flags @> '{"vegan": true}'` containment syntax to leverage the index.

**Recommendation**: This is an important finding that was previously misidentified. The GIN index EXISTS in post-migrate.sql, but the orchestrator's Prisma query syntax may not utilize it. Either:
1. Switch dietary filtering to use `$queryRaw` with `@>` containment operator, or
2. Verify with `EXPLAIN ANALYZE` whether Prisma's generated SQL actually uses the GIN index

---

## ACTIONABLE SUMMARY TABLE

| # | Item | Risk Tier | Impact (1-5) | Effort (1-5) | Urgency (1-5) | Priority Score | Target File(s) |
|---|------|-----------|-------------|-------------|---------------|----------------|-----------------|
| 1 | Enable `hnsw.iterative_scan = 'relaxed_order'` before vector queries | GREEN | 5 | 1 | 5 | **28** | `src/lib/similarity/index.ts` |
| 2 | Raise HNSW index params to m=16, ef_construction=64 | GREEN | 4 | 1 | 4 | **20** | `scripts/post-migrate.sql` |
| 3 | Raise `hnsw.ef_search` to 100 per-session for similarity queries | GREEN | 3 | 1 | 4 | **16** | `src/lib/similarity/index.ts` |
| 4 | Add `search_vector_simple` generated column + GIN index | YELLOW | 4 | 3 | 3 | **15** | `scripts/post-migrate.sql`, `src/lib/db/geo.ts` |
| 5 | Verify GIN index utilization for dietary flag queries (EXPLAIN ANALYZE) | GREEN | 4 | 1 | 4 | **20** | `src/lib/orchestrator/index.ts` |
| 6 | Add cache hit/miss ratio logging + metrics | GREEN | 3 | 1 | 3 | **12** | `src/lib/cache/index.ts`, `src/lib/orchestrator/index.ts` |
| 7 | Set connection pool `min: 2` for warm connections | GREEN | 2 | 1 | 2 | **6** | `src/lib/db/client.ts` |
| 8 | Reduce `connectionTimeoutMillis` from 10s to 5s | GREEN | 2 | 1 | 2 | **6** | `src/lib/db/client.ts` |
| 9 | Add slow query logging for `$queryRaw` calls (not just Prisma ORM) | GREEN | 3 | 2 | 2 | **10** | `src/lib/db/client.ts`, `src/lib/db/geo.ts` |
| 10 | Combine English + simple tsvector query into single UNION (eliminate two-pass) | YELLOW | 3 | 2 | 3 | **12** | `src/lib/db/geo.ts` |
| 11 | Cache warming for popular geo areas at peak meal times | YELLOW | 3 | 3 | 2 | **9** | new: `src/lib/cache/warm.ts` |
| 12 | Log cache miss events (not just hits) for TTL tuning | GREEN | 2 | 1 | 3 | **8** | `src/lib/orchestrator/index.ts` |

**Priority Score formula**: Impact x Urgency + (5 - Effort) -- higher is more urgent to implement.

---

## IMPLEMENTATION NOTES

### Item 1: Enable hnsw.iterative_scan (Priority Score 28 -- DO FIRST)

This is the single highest-impact change. In `src/lib/similarity/index.ts`, before the main vector query in `findSimilarDishesViaVector()`, add:

```typescript
// Enable iterative scans so filtered vector queries don't silently return fewer results
await prisma.$executeRaw`SET LOCAL hnsw.iterative_scan = 'relaxed_order'`;
await prisma.$executeRaw`SET LOCAL hnsw.max_scan_tuples = 10000`;
```

Use `SET LOCAL` (not `SET`) so the settings are scoped to the current transaction and don't leak to other queries. Wrap the vector query and SET statements in a `prisma.$transaction()` block.

This directly addresses the MAJOR backlog issue: "Similar dishes returns empty array for top dishes -- vector search broken."

### Item 2: Raise HNSW index params (Priority Score 20)

In `scripts/post-migrate.sql`, change line 49 from:
```sql
USING hnsw(macro_embedding vector_cosine_ops) WITH (m = 8, ef_construction = 32);
```
to:
```sql
USING hnsw(macro_embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
```

Then re-run `psql $DATABASE_URL -f scripts/post-migrate.sql`. The DROP IF EXISTS on line 48 ensures the old index is replaced.

### Item 4: Add simple tsvector column (Priority Score 15 -- YELLOW, deferred from handoff)

In `scripts/post-migrate.sql`, add after the English search_vector column:

```sql
ALTER TABLE dishes ADD COLUMN IF NOT EXISTS search_vector_simple tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(category, '')), 'C')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_dishes_search_simple ON dishes USING GIN(search_vector_simple);
```

Then modify `fullTextSearchDishes()` in `src/lib/db/geo.ts` to query both columns in a single query:

```sql
SELECT id, GREATEST(
  ts_rank(search_vector, to_tsquery('english', $1)),
  ts_rank(search_vector_simple, to_tsquery('simple', $1)) * 0.8
) AS rank
FROM dishes
WHERE (search_vector @@ to_tsquery('english', $1)
   OR search_vector_simple @@ to_tsquery('simple', $1))
  AND is_available = true
ORDER BY rank DESC
LIMIT $2
```

This eliminates the two-pass approach and the unindexed sequential scan fallback, while weighting English-stemmed matches above simple token matches.

### Item 5: Verify dietary GIN index utilization

Run `EXPLAIN ANALYZE` on the actual query Prisma generates for a dietary filter search. If the GIN index is not used, the fix is to move dietary filtering into a `$queryRaw` call using `dietary_flags @> '{"vegan": true}'::jsonb` containment syntax, which the `jsonb_path_ops` GIN index is designed for.

---

## WHAT WAS NOT RECOMMENDED (AND WHY)

| Item | Why Excluded |
|------|-------------|
| Upgrade to Prisma 8 | Prisma 7.6.0 already has query plan caching. No Prisma 8 exists yet. |
| Switch to PgBouncer | PrismaPg adapter already provides connection pooling via `pg.Pool`. Adding PgBouncer adds a separate process with minimal benefit at current scale. |
| Add PostGIS extension | earthdistance + cube extensions already handle geo queries well for the ~50 restaurant scale. PostGIS is overkill. |
| Schema migration for dietary_flags normalization | RED tier -- restructuring JSONB to separate boolean columns is a major schema migration with high regression risk. |
| Switch from ioredis to @redis/client (node-redis v5) | RED tier -- new dependency swap with no measurable benefit at current scale. |
| Add Elasticsearch/Typesense for FTS | RED tier -- PostgreSQL tsvector with proper indexing handles the ~200 dish dataset efficiently. |
| Redis 8 I/O threading | Infrastructure change, not code change. Note for ops team if deploying to production. |

---

## CROSS-REFERENCE WITH PREVIOUS WORK

| Previous Finding | Status | This Cycle |
|-----------------|--------|------------|
| GIN index on dietaryFlags (2026-04-01 backend log) | Index EXISTS in post-migrate.sql | New insight: Prisma query syntax may not utilize the index. Needs EXPLAIN ANALYZE verification. |
| search_vector tsvector + GIN (2026-04-01 search log) | Implemented in post-migrate.sql | New: simple-dictionary column still missing. Two-pass fallback is slow. |
| Singleton PrismaClient in workers (2026-04-01 backend log) | Implemented | No change needed. |
| Cache key includes searchText (2026-04-01 search log) | Implemented | Cache key is comprehensive. New: add hit/miss metrics. |
| BullMQ job deduplication (2026-04-01 backend log) | Implemented | No change needed. |
| pgvector iterative scans (2026-04-02 comprehensive digest) | Identified, not implemented | STILL NOT IMPLEMENTED -- highest priority item this cycle. |
| HNSW index params m=8/ef_c=32 | Set in post-migrate.sql | Under-tuned. Raise to m=16/ef_c=64. |
