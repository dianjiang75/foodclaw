# FoodClaw Deep Database Architecture Guide

Implementation-ready reference for PostgreSQL 16 + pgvector, Redis 7, Prisma ORM, and BullMQ.
Tailored to the FoodClaw schema as of 2026-03-30.

---

## Table of Contents

1. [pgvector: HNSW vs IVFFlat for macro_embedding vector(4)](#1-pgvector-hnsw-vs-ivfflat)
2. [JSONB Dietary Flag Query Optimization](#2-jsonb-dietary-flag-query-optimization)
3. [Geospatial: earthdistance vs PostGIS](#3-geospatial-earthdistance-vs-postgis)
4. [Prisma Performance Optimization](#4-prisma-performance-optimization)
5. [Redis Caching Strategy](#5-redis-caching-strategy)
6. [BullMQ Job Queue Patterns](#6-bullmq-job-queue-patterns)
7. [Full-Text Search: tsvector vs Elasticsearch](#7-full-text-search-tsvector-vs-elasticsearch)
8. [Database Migration Strategy](#8-database-migration-strategy)

---

## 1. pgvector: HNSW vs IVFFlat

### Verdict: Use HNSW for FoodClaw

Your current `post-migrate.sql` uses IVFFlat with `lists = 100`. This is **wrong** for your use case. Here is why and what to do instead.

### Why IVFFlat Is Wrong Here

| Factor | IVFFlat | HNSW |
|--------|---------|------|
| Build requirement | Needs rows pre-populated before CREATE INDEX | Can build on empty table, updates incrementally |
| Small dataset (<100k rows) | Poor recall; list probing wastes effort | Excellent recall even at small scale |
| Low-dimensional vectors (dim=4) | IVFFlat clustering degenerates in low dims | Graph traversal works well regardless of dim |
| Insert performance | Must REINDEX periodically as data grows | Self-maintaining; no reindex needed |
| Query latency (thousands of rows) | ~1-5ms with sequential scan competitive | ~0.5-2ms, consistently fast |
| Recall at default settings | ~70-85% | ~95-99% |

**Critical insight**: With only 4 dimensions and thousands of rows (not millions), IVFFlat's Voronoi cell partitioning creates cells that are too coarse to be useful. The overhead of the index scan can actually be *slower* than a sequential scan + sort. HNSW's graph-based approach does not suffer from this dimensionality issue.

**Second critical insight**: Your `lists = 100` is far too high. The pgvector docs recommend `lists = rows / 1000` for up to 1M rows. With 10,000 dishes, that would be `lists = 10`. With 100 lists and 10,000 rows, each list has ~100 rows, meaning the index probes almost the entire table anyway.

### Replace IVFFlat with HNSW

Update `scripts/post-migrate.sql`:

```sql
-- DROP the old IVFFlat index
DROP INDEX IF EXISTS idx_dish_macro_embedding;

-- Create HNSW index (works on empty tables, no conditional needed)
CREATE INDEX IF NOT EXISTS idx_dish_macro_embedding ON dishes
  USING hnsw(macro_embedding vector_cosine_ops)
  WITH (m = 8, ef_construction = 32);
```

### HNSW Tuning Parameters Explained

| Parameter | What it does | Our value | Why |
|-----------|-------------|-----------|-----|
| `m` | Max connections per node in the graph. Higher = better recall, more memory/build time | **8** | Default is 16. With only 4 dimensions and thousands of rows, m=8 is sufficient. Lower m = smaller index, faster builds. |
| `ef_construction` | Search breadth during index build. Higher = better recall, slower build | **32** | Default is 64. With dim=4, the search space is simple. 32 gives >99% recall. |
| `ef_search` | Search breadth at query time (SET per session/transaction) | **20** | Default is 40. For dim=4 with m=8, ef_search=20 gives ~99.5% recall. |

```sql
-- Set at session level for search queries (or in a function)
SET hnsw.ef_search = 20;

-- Query: find 5 dishes with most similar macro profile
SELECT id, name, calories_min, protein_max_g,
       macro_embedding <=> $1::vector AS distance
FROM dishes
WHERE macro_embedding IS NOT NULL
  AND is_available = true
ORDER BY macro_embedding <=> $1::vector
LIMIT 5;
```

### Replace App-Level Cosine Similarity with pgvector

Your `src/lib/similarity/index.ts` currently fetches candidates and computes cosine similarity in JavaScript. This is inefficient. Replace with a raw SQL query through pgvector:

```typescript
// src/lib/similarity/index.ts — replacement for findSimilarDishes
export async function findSimilarDishes(
  dishId: string,
  options: SimilarityOptions
): Promise<SimilarDish[]> {
  const limit = options.limit ?? 5;

  // Get the source dish's macro embedding
  const [source] = await prisma.$queryRawUnsafe<
    { macro_embedding: string }[]
  >(
    `SELECT macro_embedding::text FROM dishes WHERE id = $1`,
    dishId
  );

  if (!source?.macro_embedding) {
    // Fallback: compute embedding on the fly from macro columns
    const dish = await prisma.dish.findUnique({ where: { id: dishId } });
    if (!dish?.caloriesMin) return [];

    const vec = normalizeMacros(
      dish.caloriesMin,
      dish.proteinMaxG ? Number(dish.proteinMaxG) : null,
      dish.carbsMaxG ? Number(dish.carbsMaxG) : null,
      dish.fatMaxG ? Number(dish.fatMaxG) : null
    );
    if (!vec) return [];

    // Use computed vector for similarity search
    return queryBySimilarity(`[${vec.join(",")}]`, dishId, limit);
  }

  return queryBySimilarity(source.macro_embedding, dishId, limit);
}

async function queryBySimilarity(
  embedding: string,
  excludeDishId: string,
  limit: number
): Promise<SimilarDish[]> {
  const results = await prisma.$queryRawUnsafe<SimilarDish[]>(
    `
    SELECT
      d.id,
      d.name,
      r.name AS restaurant_name,
      r.id AS restaurant_id,
      d.calories_min,
      d.calories_max,
      d.protein_max_g,
      ROUND((1 - (d.macro_embedding <=> $1::vector))::numeric, 3) AS similarity_score
    FROM dishes d
    JOIN restaurants r ON r.id = d.restaurant_id
    WHERE d.id != $2
      AND d.macro_embedding IS NOT NULL
      AND d.is_available = true
      AND r.is_active = true
      AND (1 - (d.macro_embedding <=> $1::vector)) > 0.85
    ORDER BY d.macro_embedding <=> $1::vector
    LIMIT $3
    `,
    embedding,
    excludeDishId,
    limit
  );

  return results;
}
```

### Keeping macro_embedding in Sync

Create a trigger or a BullMQ job that updates the embedding whenever macros change:

```sql
-- Function to auto-compute macro_embedding from macro columns
CREATE OR REPLACE FUNCTION compute_macro_embedding()
RETURNS TRIGGER AS $$
DECLARE
  cal_norm float;
  pro_norm float;
  carb_norm float;
  fat_norm float;
  magnitude float;
BEGIN
  IF NEW.calories_min IS NULL THEN
    NEW.macro_embedding := NULL;
    RETURN NEW;
  END IF;

  cal_norm  := COALESCE(NEW.calories_min, 0)::float / 1000.0;
  pro_norm  := COALESCE(NEW.protein_max_g, 0)::float / 50.0;
  carb_norm := COALESCE(NEW.carbs_max_g, 0)::float / 100.0;
  fat_norm  := COALESCE(NEW.fat_max_g, 0)::float / 50.0;

  magnitude := sqrt(cal_norm^2 + pro_norm^2 + carb_norm^2 + fat_norm^2);

  IF magnitude = 0 THEN
    NEW.macro_embedding := NULL;
  ELSE
    NEW.macro_embedding := ('[' ||
      (cal_norm / magnitude)::text || ',' ||
      (pro_norm / magnitude)::text || ',' ||
      (carb_norm / magnitude)::text || ',' ||
      (fat_norm / magnitude)::text || ']')::vector;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_dish_macro_embedding
  BEFORE INSERT OR UPDATE OF calories_min, protein_max_g, carbs_max_g, fat_max_g
  ON dishes
  FOR EACH ROW
  EXECUTE FUNCTION compute_macro_embedding();
```

### When to Consider Exact Search Instead

With vector(4) and <50,000 rows, **exact search (no index) is competitive**. Benchmark both:

```sql
-- Exact scan (disable index):
SET enable_indexscan = off;
EXPLAIN ANALYZE
SELECT id, macro_embedding <=> '[0.5,0.3,0.4,0.6]'::vector AS dist
FROM dishes
WHERE macro_embedding IS NOT NULL
ORDER BY dist LIMIT 5;

-- Index scan (re-enable):
SET enable_indexscan = on;
EXPLAIN ANALYZE
SELECT id, macro_embedding <=> '[0.5,0.3,0.4,0.6]'::vector AS dist
FROM dishes
WHERE macro_embedding IS NOT NULL
ORDER BY dist LIMIT 5;
```

If exact scan is within 2x of HNSW time, skip the index entirely. Below ~5,000 rows with dim=4, this is often the case. The HNSW index shines once you pass ~10,000 rows.

---

## 2. JSONB Dietary Flag Query Optimization

### Current State

Your `dietary_flags` column stores JSON like:
```json
{"vegan": true, "gluten_free": false, "halal": null, "kosher": true}
```

Current index: `CREATE INDEX idx_dishes_dietary ON dishes USING GIN(dietary_flags);`

Current Prisma query (from `orchestrator/index.ts`):
```typescript
{ dietaryFlags: { path: [key], equals: true } }
```

This generates SQL like:
```sql
WHERE dietary_flags->'vegan' = 'true' AND dietary_flags->'gluten_free' = 'true'
```

### Problem: GIN Index Does Not Help Here

A GIN index on the entire JSONB column supports containment operators (`@>`, `?`, `?&`), **not** path-based equality checks. Your current Prisma queries generate path extraction (`->`), which **cannot use the GIN index**. The planner falls back to sequential scan.

Verify with:
```sql
EXPLAIN ANALYZE
SELECT * FROM dishes WHERE dietary_flags->'vegan' = 'true';
-- Will show: Seq Scan on dishes
```

### Solution A: Use Containment Operator (Best with Current Schema)

Rewrite queries to use `@>` which the GIN index supports:

```sql
-- This USES the GIN index:
SELECT * FROM dishes
WHERE dietary_flags @> '{"vegan": true, "gluten_free": true}'::jsonb;

-- Verify:
EXPLAIN ANALYZE
SELECT * FROM dishes
WHERE dietary_flags @> '{"vegan": true, "gluten_free": true}'::jsonb;
-- Will show: Bitmap Index Scan on idx_dishes_dietary
```

In Prisma, use raw SQL for this query:

```typescript
function buildDietaryWhereRaw(
  restrictions: UserSearchQuery["dietary_restrictions"]
): string | null {
  const flags: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(restrictions)) {
    if (value === true) flags[key] = true;
  }
  if (Object.keys(flags).length === 0) return null;
  return JSON.stringify(flags);
}

// In search():
const dietaryFilter = buildDietaryWhereRaw(query.dietary_restrictions);

const dishes = dietaryFilter
  ? await prisma.$queryRawUnsafe<DishRow[]>(
      `
      SELECT d.*, r.name as restaurant_name, r.address, r.google_rating,
             r.cuisine_type, r.is_active, r.id as restaurant_id
      FROM dishes d
      JOIN restaurants r ON r.id = d.restaurant_id
      WHERE d.is_available = true
        AND r.is_active = true
        AND d.dietary_flags @> $1::jsonb
      ORDER BY d.created_at DESC
      LIMIT $2 OFFSET $3
      `,
      dietaryFilter,
      limit,
      offset
    )
  : await prisma.dish.findMany({ /* existing Prisma query */ });
```

### Solution B: Expression Indexes on Specific Flags (Fastest for Known Flags)

If your dietary flags are a known set, create expression indexes:

```sql
-- Expression indexes on the most-queried flags
CREATE INDEX idx_dishes_vegan
  ON dishes ((dietary_flags->>'vegan'))
  WHERE dietary_flags->>'vegan' = 'true';

CREATE INDEX idx_dishes_gluten_free
  ON dishes ((dietary_flags->>'gluten_free'))
  WHERE dietary_flags->>'gluten_free' = 'true';

CREATE INDEX idx_dishes_halal
  ON dishes ((dietary_flags->>'halal'))
  WHERE dietary_flags->>'halal' = 'true';

CREATE INDEX idx_dishes_kosher
  ON dishes ((dietary_flags->>'kosher'))
  WHERE dietary_flags->>'kosher' = 'true';
```

These are **partial indexes** -- they only index rows where the flag is true, making them tiny and fast.

Query pattern that hits these indexes:
```sql
SELECT * FROM dishes
WHERE dietary_flags->>'vegan' = 'true'
  AND dietary_flags->>'gluten_free' = 'true';
```

### Solution C: Denormalize to Boolean Columns (Nuclear Option, Fastest)

If dietary filtering is your #1 query pattern, denormalize:

```sql
ALTER TABLE dishes ADD COLUMN is_vegan      BOOLEAN GENERATED ALWAYS AS ((dietary_flags->>'vegan')::boolean)    STORED;
ALTER TABLE dishes ADD COLUMN is_gluten_free BOOLEAN GENERATED ALWAYS AS ((dietary_flags->>'gluten_free')::boolean) STORED;
ALTER TABLE dishes ADD COLUMN is_halal      BOOLEAN GENERATED ALWAYS AS ((dietary_flags->>'halal')::boolean)    STORED;
ALTER TABLE dishes ADD COLUMN is_kosher     BOOLEAN GENERATED ALWAYS AS ((dietary_flags->>'kosher')::boolean)   STORED;
ALTER TABLE dishes ADD COLUMN is_dairy_free BOOLEAN GENERATED ALWAYS AS ((dietary_flags->>'dairy_free')::boolean) STORED;
ALTER TABLE dishes ADD COLUMN is_nut_free   BOOLEAN GENERATED ALWAYS AS ((dietary_flags->>'nut_free')::boolean)  STORED;

-- Partial indexes on the generated columns
CREATE INDEX idx_dishes_is_vegan ON dishes (id) WHERE is_vegan = true;
CREATE INDEX idx_dishes_is_gluten_free ON dishes (id) WHERE is_gluten_free = true;
CREATE INDEX idx_dishes_is_halal ON dishes (id) WHERE is_halal = true;
CREATE INDEX idx_dishes_is_kosher ON dishes (id) WHERE is_kosher = true;
```

Note: PostgreSQL 16 does not support GENERATED ALWAYS AS for JSONB extraction. Use a trigger instead:

```sql
ALTER TABLE dishes
  ADD COLUMN is_vegan BOOLEAN DEFAULT false,
  ADD COLUMN is_gluten_free BOOLEAN DEFAULT false,
  ADD COLUMN is_halal BOOLEAN DEFAULT false,
  ADD COLUMN is_kosher BOOLEAN DEFAULT false,
  ADD COLUMN is_dairy_free BOOLEAN DEFAULT false,
  ADD COLUMN is_nut_free BOOLEAN DEFAULT false;

CREATE OR REPLACE FUNCTION sync_dietary_booleans()
RETURNS TRIGGER AS $$
BEGIN
  NEW.is_vegan      := COALESCE((NEW.dietary_flags->>'vegan')::boolean, false);
  NEW.is_gluten_free := COALESCE((NEW.dietary_flags->>'gluten_free')::boolean, false);
  NEW.is_halal      := COALESCE((NEW.dietary_flags->>'halal')::boolean, false);
  NEW.is_kosher     := COALESCE((NEW.dietary_flags->>'kosher')::boolean, false);
  NEW.is_dairy_free := COALESCE((NEW.dietary_flags->>'dairy_free')::boolean, false);
  NEW.is_nut_free   := COALESCE((NEW.dietary_flags->>'nut_free')::boolean, false);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_dietary
  BEFORE INSERT OR UPDATE OF dietary_flags ON dishes
  FOR EACH ROW EXECUTE FUNCTION sync_dietary_booleans();

-- Backfill existing rows
UPDATE dishes SET dietary_flags = dietary_flags WHERE dietary_flags IS NOT NULL;

-- Create partial indexes
CREATE INDEX idx_dishes_is_vegan ON dishes (id) WHERE is_vegan = true;
CREATE INDEX idx_dishes_is_gluten_free ON dishes (id) WHERE is_gluten_free = true;
```

### Recommendation

**Use Solution A (containment operator @>)** as the immediate fix. It requires zero schema changes -- just a query rewrite. The existing GIN index already supports it. Move to Solution C only if you see GIN index scans exceeding 5ms at scale.

### Composite Index for the Common Query Pattern

The most common FoodClaw query is "vegan dishes sorted by protein near me." Create a composite:

```sql
-- Covers: dietary filter + protein sort + calorie filter
CREATE INDEX idx_dishes_dietary_protein ON dishes
  USING GIN(dietary_flags)
  INCLUDE (protein_max_g, calories_min, is_available);
```

Wait -- GIN indexes do not support INCLUDE. Instead, for the combined dietary + nutritional filter:

```sql
-- For the "vegan, high protein" query pattern
CREATE INDEX idx_dishes_vegan_protein ON dishes (protein_max_g DESC NULLS LAST)
  WHERE (dietary_flags @> '{"vegan": true}') AND is_available = true;

-- For "gluten-free, low calorie"
CREATE INDEX idx_dishes_gf_calories ON dishes (calories_min ASC NULLS LAST)
  WHERE (dietary_flags @> '{"gluten_free": true}') AND is_available = true;
```

---

## 3. Geospatial: earthdistance vs PostGIS

### Current State

Your schema uses the `earthdistance` extension with `ll_to_earth()`:
```sql
CREATE INDEX idx_restaurants_location ON restaurants
  USING GIST(ll_to_earth(latitude::float, longitude::float));
```

### earthdistance vs PostGIS Comparison

| Factor | earthdistance + cube | PostGIS |
|--------|---------------------|---------|
| Install complexity | Built-in, no extra dependencies | Requires `postgis` system package |
| Index type | GIST on cube (3D Cartesian) | GIST on geography/geometry |
| Distance accuracy | Spherical model, ~0.3% error | WGS84 ellipsoid, sub-meter accuracy |
| Query syntax | `earth_distance(ll_to_earth(a), ll_to_earth(b))` | `ST_DDistance(geog_a, geog_b)` |
| Radius query | `earth_box(ll_to_earth(lat,lng), radius) @> ll_to_earth(lat2,lng2)` | `ST_DWithin(geog, point, meters)` |
| Performance (point-in-radius) | Good, ~1-3ms for 10k rows | Slightly better, ~0.5-2ms, more optimized GIST |
| KNN (k-nearest) | No native KNN support; must use earth_box + sort | `ORDER BY geog <-> point LIMIT k` uses index |
| Cloud support | Always available | Available on all major cloud PostgreSQL (RDS, Cloud SQL, Supabase) |

### Recommendation: Stick with earthdistance for Now

For FoodClaw's use case (radius search for restaurants within 1-10 miles in a metro area), earthdistance is adequate. The 0.3% accuracy difference is irrelevant for food delivery. PostGIS adds deployment complexity for minimal gain.

**Switch to PostGIS only if** you need: KNN-indexed queries ("5 nearest restaurants"), polygon-based delivery zones, or route-distance calculations.

### Optimized earthdistance Queries

Your current orchestrator does **not** actually filter by distance. The search function has `distance_miles: null` in the output. Fix this:

```sql
-- Radius search: restaurants within X miles of a point
-- Uses earth_box for index-assisted bounding box, then earth_distance for exact filter
SELECT r.id, r.name, r.latitude, r.longitude,
       earth_distance(
         ll_to_earth(r.latitude::float, r.longitude::float),
         ll_to_earth($1::float, $2::float)
       ) / 1609.34 AS distance_miles
FROM restaurants r
WHERE earth_box(ll_to_earth($1::float, $2::float), $3 * 1609.34)
      @> ll_to_earth(r.latitude::float, r.longitude::float)
  AND earth_distance(
        ll_to_earth(r.latitude::float, r.longitude::float),
        ll_to_earth($1::float, $2::float)
      ) <= $3 * 1609.34
  AND r.is_active = true
ORDER BY distance_miles;
-- $1 = user lat, $2 = user lng, $3 = radius in miles
```

### The Full Optimized Search Query

Combine geo + dietary + nutritional into a single raw query:

```typescript
// src/lib/orchestrator/search-query.ts
export async function executeSearch(query: UserSearchQuery) {
  const radiusMeters = query.radius_miles * 1609.34;
  const dietaryFilter = buildDietaryContainment(query.dietary_restrictions);

  const now = new Date();
  const dayOfWeek = now.getDay();
  const hour = now.getHours();

  const sql = `
    SELECT
      d.id, d.name, d.description, d.price, d.category,
      d.calories_min, d.calories_max,
      d.protein_min_g, d.protein_max_g,
      d.carbs_min_g, d.carbs_max_g,
      d.fat_min_g, d.fat_max_g,
      d.macro_confidence, d.dietary_flags, d.dietary_confidence,
      r.id AS restaurant_id, r.name AS restaurant_name,
      r.address, r.google_rating, r.cuisine_type,
      earth_distance(
        ll_to_earth(r.latitude::float, r.longitude::float),
        ll_to_earth($1::float, $2::float)
      ) / 1609.34 AS distance_miles,
      rs.average_dish_rating, rs.summary_text, rs.total_reviews_analyzed,
      rl.typical_busyness_pct, rl.estimated_wait_minutes
    FROM dishes d
    JOIN restaurants r ON r.id = d.restaurant_id
    LEFT JOIN review_summaries rs ON rs.dish_id = d.id
    LEFT JOIN restaurant_logistics rl
      ON rl.restaurant_id = r.id
      AND rl.day_of_week = $5
      AND rl.hour = $6
    WHERE d.is_available = true
      AND r.is_active = true
      AND earth_box(ll_to_earth($1::float, $2::float), $3)
          @> ll_to_earth(r.latitude::float, r.longitude::float)
      AND earth_distance(
            ll_to_earth(r.latitude::float, r.longitude::float),
            ll_to_earth($1::float, $2::float)
          ) <= $3
      ${dietaryFilter ? `AND d.dietary_flags @> $7::jsonb` : ""}
      ${query.calorie_limit ? `AND d.calories_min <= $8` : ""}
      ${query.protein_min_g ? `AND d.protein_max_g >= $9` : ""}
      ${query.max_wait_minutes ? `AND (rl.estimated_wait_minutes IS NULL OR rl.estimated_wait_minutes <= $10)` : ""}
    ORDER BY ${buildSortClause(query)}
    LIMIT $4 OFFSET ${query.offset ?? 0}
  `;

  // Build params array dynamically based on which filters are active
  const params: unknown[] = [
    query.latitude,     // $1
    query.longitude,    // $2
    radiusMeters,       // $3
    query.limit ?? 20,  // $4
    dayOfWeek,          // $5
    hour,               // $6
  ];

  let paramIndex = 7;
  if (dietaryFilter) { params.push(dietaryFilter); paramIndex++; }
  if (query.calorie_limit) { params.push(query.calorie_limit); paramIndex++; }
  if (query.protein_min_g) { params.push(query.protein_min_g); paramIndex++; }
  if (query.max_wait_minutes) { params.push(query.max_wait_minutes); paramIndex++; }

  return prisma.$queryRawUnsafe(sql, ...params);
}

function buildSortClause(query: UserSearchQuery): string {
  switch (query.sort_by) {
    case "distance": return "distance_miles ASC";
    case "rating": return "rs.average_dish_rating DESC NULLS LAST";
    case "wait_time": return "rl.estimated_wait_minutes ASC NULLS LAST";
    case "macro_match": return "d.protein_max_g DESC NULLS LAST";
    default:
      switch (query.nutritional_goal) {
        case "max_protein": return "d.protein_max_g DESC NULLS LAST";
        case "min_calories": return "d.calories_min ASC NULLS LAST";
        case "min_fat": return "d.fat_min_g ASC NULLS LAST";
        case "min_carbs": return "d.carbs_min_g ASC NULLS LAST";
        default: return "distance_miles ASC";
      }
  }
}
```

### If You Migrate to PostGIS Later

```sql
-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add geography column
ALTER TABLE restaurants ADD COLUMN location geography(Point, 4326);

-- Populate from lat/lng
UPDATE restaurants SET location = ST_SetSRID(ST_MakePoint(longitude::float, latitude::float), 4326)::geography;

-- GIST index on geography
CREATE INDEX idx_restaurants_geo ON restaurants USING GIST(location);

-- Radius query (cleaner syntax):
SELECT *, ST_Distance(location, ST_MakePoint($2, $1)::geography) / 1609.34 AS distance_miles
FROM restaurants
WHERE ST_DWithin(location, ST_MakePoint($2, $1)::geography, $3 * 1609.34)
ORDER BY location <-> ST_MakePoint($2, $1)::geography;
-- Note: ST_MakePoint takes (longitude, latitude), not (lat, lng)!

-- Trigger to keep location in sync
CREATE OR REPLACE FUNCTION sync_restaurant_location()
RETURNS TRIGGER AS $$
BEGIN
  NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude::float, NEW.latitude::float), 4326)::geography;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_restaurant_location
  BEFORE INSERT OR UPDATE OF latitude, longitude ON restaurants
  FOR EACH ROW EXECUTE FUNCTION sync_restaurant_location();
```

---

## 4. Prisma Performance Optimization

### 4.1 Raw SQL vs Prisma Client

**Use Prisma Client for**: simple CRUD, admin endpoints, user profile management, single-entity reads.

**Use raw SQL ($queryRawUnsafe) for**: search queries, geospatial queries, pgvector similarity, JSONB containment, any query joining 3+ tables with complex filters.

Your current search in `orchestrator/index.ts` uses Prisma Client `findMany`, which:
- Cannot express `@>` containment for dietary_flags
- Cannot express `earth_box`/`earth_distance` for geospatial
- Cannot use pgvector operators
- Generates N+1 queries for logistics (separate `findMany` after the main query)

The unified raw SQL query in Section 3 above solves all of these in a single round-trip.

### 4.2 Connection Pooling

Your current `client.ts` uses `@prisma/adapter-pg` (the pg driver adapter). This is correct for Prisma 6+. For connection pooling:

```typescript
// src/lib/db/client.ts — improved with connection pool configuration
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

function createPrismaClient(): PrismaClient {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,                    // Max connections in pool
    min: 5,                     // Min idle connections
    idleTimeoutMillis: 30000,   // Close idle connections after 30s
    connectionTimeoutMillis: 5000, // Fail if can't connect in 5s
    statement_timeout: 10000,   // Kill queries running >10s
  });

  globalForPrisma.pool = pool;

  const adapter = new PrismaPg({ pool });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development"
      ? [{ level: "query", emit: "event" }]
      : [],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// For serverless (Vercel), use PgBouncer or Prisma Accelerate:
// DATABASE_URL="postgresql://...?pgbouncer=true&connection_limit=1"
```

### 4.3 Query Batching and N+1 Prevention

```typescript
// BAD: N+1 pattern (your current logistics fetch)
const restaurantIds = dishes.map(d => d.restaurantId);
for (const id of restaurantIds) {
  const logistics = await prisma.restaurantLogistics.findUnique({...});
}

// GOOD: Single batch query (your current code actually does this correctly with findMany + in)
const logisticsRows = await prisma.restaurantLogistics.findMany({
  where: { restaurantId: { in: restaurantIds }, dayOfWeek: now.getDay(), hour: now.getHours() },
});

// BEST: Join in the raw SQL query (Section 3 above does this)
```

### 4.4 Prisma Query Logging for Performance Analysis

```typescript
// In development, log slow queries
const prisma = new PrismaClient({
  adapter,
  log: [{ level: "query", emit: "event" }],
});

prisma.$on("query" as never, (e: { query: string; duration: number }) => {
  if (e.duration > 100) {
    console.warn(`SLOW QUERY (${e.duration}ms):`, e.query);
  }
});
```

### 4.5 Typed Raw Query Helpers

```typescript
// src/lib/db/queries.ts — type-safe raw query wrappers
import { prisma } from "./client";
import { Prisma } from "@/generated/prisma/client";

export interface DishSearchRow {
  id: string;
  name: string;
  description: string | null;
  price: string | null; // Decimal comes as string from raw
  calories_min: number | null;
  calories_max: number | null;
  protein_max_g: string | null;
  restaurant_id: string;
  restaurant_name: string;
  distance_miles: number;
  average_dish_rating: string | null;
  estimated_wait_minutes: number | null;
}

export async function searchDishes(params: {
  lat: number;
  lng: number;
  radiusMeters: number;
  dietaryFlags?: string; // JSON string for @> operator
  limit: number;
  offset: number;
}): Promise<DishSearchRow[]> {
  return prisma.$queryRaw<DishSearchRow[]>`
    SELECT d.id, d.name, d.description, d.price,
           d.calories_min, d.calories_max, d.protein_max_g,
           r.id AS restaurant_id, r.name AS restaurant_name,
           earth_distance(
             ll_to_earth(r.latitude::float, r.longitude::float),
             ll_to_earth(${params.lat}::float, ${params.lng}::float)
           ) / 1609.34 AS distance_miles,
           rs.average_dish_rating,
           rl.estimated_wait_minutes
    FROM dishes d
    JOIN restaurants r ON r.id = d.restaurant_id
    LEFT JOIN review_summaries rs ON rs.dish_id = d.id
    LEFT JOIN restaurant_logistics rl ON rl.restaurant_id = r.id
      AND rl.day_of_week = ${new Date().getDay()}
      AND rl.hour = ${new Date().getHours()}
    WHERE d.is_available = true
      AND r.is_active = true
      AND earth_box(ll_to_earth(${params.lat}::float, ${params.lng}::float), ${params.radiusMeters})
          @> ll_to_earth(r.latitude::float, r.longitude::float)
      ${params.dietaryFlags
        ? Prisma.sql`AND d.dietary_flags @> ${params.dietaryFlags}::jsonb`
        : Prisma.empty}
    ORDER BY distance_miles
    LIMIT ${params.limit} OFFSET ${params.offset}
  `;
}
```

---

## 5. Redis Caching Strategy

### 5.1 Cache Hierarchy (What to Cache and TTLs)

Your current TTL configuration in `src/lib/cache/index.ts` is reasonable. Here is the refined strategy:

| Data Type | Cache Key Pattern | TTL | Reason |
|-----------|------------------|-----|--------|
| USDA nutrition data | `usda:{fdcId}` | 30 days | Static reference data |
| Restaurant metadata | `rest:{id}` | 24 hours | Changes rarely |
| Menu/dish list | `menu:{restaurantId}` | 12 hours | May change daily |
| Dish macros | `macros:{dishId}` | 7 days | Rarely changes once computed |
| Review summaries | `reviews:{dishId}` | 3 days | Updates with new reviews |
| Wait time/busyness | `traffic:{restaurantId}:{dow}:{hour}` | 10 minutes | Real-time, volatile |
| Delivery availability | `delivery:{restaurantId}:{platform}` | 5 minutes | Very volatile |
| Search results | `query:{hash}` | 3 minutes | Volatile, must feel fresh |
| Dish detail page | `dish-detail:{dishId}` | 1 hour | Moderate update frequency |
| Popular dishes (leaderboard) | `popular:{cuisineType}:{geoHash}` | 30 minutes | Aggregation cache |

### 5.2 Updated Cache Module

```typescript
// src/lib/cache/index.ts — enhanced version

export const TTL = {
  USDA: 30 * 24 * 60 * 60,       // 30 days
  RESTAURANT: 24 * 60 * 60,       // 24 hours (was 7 days — too long)
  MENU: 12 * 60 * 60,             // 12 hours (was 7 days)
  MACROS: 7 * 24 * 60 * 60,       // 7 days
  REVIEWS: 3 * 24 * 60 * 60,      // 3 days
  TRAFFIC: 10 * 60,                // 10 minutes (was 15)
  DELIVERY: 5 * 60,                // 5 minutes (was 15 — too stale for delivery)
  QUERY: 3 * 60,                   // 3 minutes (was 5)
  DISH_DETAIL: 60 * 60,           // 1 hour
  POPULAR: 30 * 60,                // 30 minutes
} as const;
```

### 5.3 Cache-Aside Pattern for Search Results

```typescript
// Stale-While-Revalidate pattern for search
export async function searchWithSWR(query: UserSearchQuery): Promise<SearchResults> {
  const cacheKey = buildQueryCacheKey(extractCacheParams(query));

  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    const parsed = JSON.parse(cached) as SearchResults & { cachedAt: number };
    const age = Date.now() - parsed.cachedAt;

    // If cache is fresh (<3 min), return immediately
    if (age < TTL.QUERY * 1000) {
      return { ...parsed, cached: true };
    }

    // If cache is stale but not expired (<10 min), return stale + refresh in background
    if (age < TTL.QUERY * 1000 * 3) {
      // Fire-and-forget background refresh
      refreshSearchCache(query, cacheKey).catch(console.error);
      return { ...parsed, cached: true };
    }
  }

  // Cache miss or expired: execute fresh query
  const result = await executeSearchQuery(query);
  await redis.set(cacheKey, JSON.stringify({ ...result, cachedAt: Date.now() }), "EX", TTL.QUERY * 3);
  return { ...result, cached: false };
}
```

### 5.4 Real-Time Data: Traffic and Delivery

For data that changes every few minutes, use Redis Hash for efficient partial updates:

```typescript
// Store traffic data as a Redis hash (not JSON string)
// This lets us update individual fields without read-modify-write

// Write (from logistics-poller agent):
async function updateTraffic(restaurantId: string, dayOfWeek: number, hour: number, data: {
  busynessPct: number;
  waitMinutes: number;
}) {
  const key = `traffic:${restaurantId}:${dayOfWeek}:${hour}`;
  await redis.hmset(key, {
    busyness_pct: data.busynessPct.toString(),
    wait_minutes: data.waitMinutes.toString(),
    updated_at: Date.now().toString(),
  });
  await redis.expire(key, TTL.TRAFFIC);
}

// Read (from search):
async function getTraffic(restaurantId: string): Promise<{
  busynessPct: number | null;
  waitMinutes: number | null;
} | null> {
  const now = new Date();
  const key = `traffic:${restaurantId}:${now.getDay()}:${now.getHours()}`;
  const data = await redis.hgetall(key);

  if (!data || !data.busyness_pct) return null;

  return {
    busynessPct: parseInt(data.busyness_pct),
    waitMinutes: parseInt(data.wait_minutes),
  };
}

// Batch read for multiple restaurants (pipeline):
async function getTrafficBatch(restaurantIds: string[]): Promise<Map<string, {
  busynessPct: number | null;
  waitMinutes: number | null;
}>> {
  const now = new Date();
  const pipeline = redis.pipeline();

  for (const id of restaurantIds) {
    pipeline.hgetall(`traffic:${id}:${now.getDay()}:${now.getHours()}`);
  }

  const results = await pipeline.exec();
  const map = new Map();

  restaurantIds.forEach((id, i) => {
    const [err, data] = results![i];
    if (!err && data && typeof data === "object" && Object.keys(data as object).length > 0) {
      const d = data as Record<string, string>;
      map.set(id, {
        busynessPct: d.busyness_pct ? parseInt(d.busyness_pct) : null,
        waitMinutes: d.wait_minutes ? parseInt(d.wait_minutes) : null,
      });
    }
  });

  return map;
}
```

### 5.5 Cache Invalidation Patterns

Your current `invalidateRestaurant` uses SCAN with a wildcard match (`*${restaurantId}*`). This is **dangerous at scale** because SCAN iterates the entire keyspace.

Better approach: use Redis Sets to track cache dependencies.

```typescript
// When caching, register the cache key in a dependency set
async function cacheWithDeps(
  key: string,
  value: unknown,
  ttl: number,
  dependencies: string[] // e.g., ["rest:abc123", "dish:xyz"]
) {
  const pipeline = redis.pipeline();
  pipeline.set(key, JSON.stringify(value), "EX", ttl);

  for (const dep of dependencies) {
    const depKey = `deps:${dep}`;
    pipeline.sadd(depKey, key);
    pipeline.expire(depKey, ttl + 60); // Dependency set lives slightly longer
  }

  await pipeline.exec();
}

// Invalidate all caches that depend on an entity
async function invalidateEntity(entityKey: string): Promise<number> {
  const depKey = `deps:${entityKey}`;
  const keys = await redis.smembers(depKey);

  if (keys.length === 0) return 0;

  const pipeline = redis.pipeline();
  for (const key of keys) {
    pipeline.del(key);
  }
  pipeline.del(depKey);
  await pipeline.exec();

  return keys.length;
}

// Usage:
// When a menu crawl updates dishes for restaurant "abc":
await invalidateEntity(`rest:abc`);
// This deletes all search results, menu caches, dish details that included restaurant "abc"
```

### 5.6 Redis Configuration for FoodClaw

```typescript
// src/lib/cache/redis.ts — production-ready
import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export const redis =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    // Connection pool settings
    family: 4,                    // IPv4
    connectTimeout: 5000,
    commandTimeout: 3000,         // Individual command timeout
    retryStrategy(times) {
      if (times > 5) return null; // Stop retrying after 5 attempts
      return Math.min(times * 200, 2000); // Exponential backoff
    },
    // Enable offline queue to buffer commands during reconnection
    enableOfflineQueue: true,
    // Key prefix for namespace isolation
    keyPrefix: "ns:",
  });

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

// Graceful shutdown
process.on("SIGTERM", () => redis.quit());
```

---

## 6. BullMQ Job Queue Patterns

### 6.1 Queue Architecture

Create separate queues for each agent type with different concurrency and rate limits:

```typescript
// src/lib/queue/queues.ts
import { Queue, Worker, QueueEvents } from "bullmq";
import Redis from "ioredis";

const connection = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null, // Required by BullMQ
});

// ─── Queue Definitions ─────────────────────────────────

export const menuCrawlerQueue = new Queue("menu-crawler", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { age: 24 * 3600, count: 1000 },
    removeOnFail: { age: 7 * 24 * 3600, count: 5000 },
  },
});

export const photoAnalyzerQueue = new Queue("photo-analyzer", {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "exponential", delay: 10000 },
    removeOnComplete: { age: 24 * 3600, count: 500 },
    removeOnFail: { age: 7 * 24 * 3600, count: 2000 },
  },
});

export const reviewAggregatorQueue = new Queue("review-aggregator", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 15000 },
    removeOnComplete: { age: 48 * 3600, count: 500 },
    removeOnFail: { age: 7 * 24 * 3600, count: 1000 },
  },
});

export const logisticsPollerQueue = new Queue("logistics-poller", {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "fixed", delay: 30000 },
    removeOnComplete: { age: 3600, count: 200 }, // Short-lived
    removeOnFail: { age: 24 * 3600, count: 500 },
  },
});

// ─── Priority Levels ─────────────────────────────────
// Lower number = higher priority in BullMQ
export const PRIORITY = {
  CRITICAL: 1,    // User-triggered actions (e.g., "refresh this restaurant")
  HIGH: 3,        // Real-time data (logistics polling)
  NORMAL: 5,      // Scheduled crawls
  LOW: 10,        // Background enrichment, backfill
  BULK: 20,       // Area-wide re-crawls
} as const;
```

### 6.2 Worker Definitions with Rate Limiting

```typescript
// src/lib/queue/workers/menu-crawler.worker.ts
import { Worker, RateLimiterError } from "bullmq";
import { crawlRestaurantMenu } from "@/lib/agents/menu-crawler";
import { invalidateEntity } from "@/lib/cache";

const menuCrawlerWorker = new Worker(
  "menu-crawler",
  async (job) => {
    const { restaurantId, source, googlePlaceId } = job.data;

    job.log(`Starting menu crawl for ${restaurantId} from ${source}`);
    await job.updateProgress(10);

    const result = await crawlRestaurantMenu({
      restaurantId,
      source,
      googlePlaceId,
    });

    await job.updateProgress(80);

    // Invalidate caches after successful crawl
    await invalidateEntity(`rest:${restaurantId}`);
    await invalidateEntity(`menu:${restaurantId}`);

    await job.updateProgress(100);

    return {
      dishesFound: result.dishCount,
      newDishes: result.newDishes,
      updatedDishes: result.updatedDishes,
    };
  },
  {
    connection: new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
      maxRetriesPerRequest: null,
    }),
    concurrency: 3,           // 3 concurrent menu crawls
    limiter: {
      max: 10,                // Max 10 jobs
      duration: 60000,        // Per 60 seconds (across all workers)
    },
    stalledInterval: 120000,  // Mark jobs stalled after 2 min of no progress
    lockDuration: 300000,     // Lock held for max 5 minutes
  }
);

menuCrawlerWorker.on("completed", (job) => {
  console.log(`Menu crawl completed: ${job.id}`, job.returnvalue);
});

menuCrawlerWorker.on("failed", (job, err) => {
  console.error(`Menu crawl failed: ${job?.id}`, err.message);
});

export default menuCrawlerWorker;
```

```typescript
// src/lib/queue/workers/photo-analyzer.worker.ts
import { Worker } from "bullmq";

const photoAnalyzerWorker = new Worker(
  "photo-analyzer",
  async (job) => {
    const { dishId, photoUrls } = job.data;

    // Rate-limited Vision AI calls
    const results = [];
    for (let i = 0; i < photoUrls.length; i++) {
      const result = await analyzePhoto(photoUrls[i]);
      results.push(result);
      await job.updateProgress(Math.round(((i + 1) / photoUrls.length) * 100));
    }

    // Aggregate macro estimates from all photos
    const aggregated = aggregateMacroEstimates(results);

    return { dishId, macroEstimate: aggregated, photosAnalyzed: results.length };
  },
  {
    connection: new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
      maxRetriesPerRequest: null,
    }),
    concurrency: 2,             // Vision AI is expensive, limit concurrency
    limiter: {
      max: 30,                  // 30 API calls per minute (typical Vision API limit)
      duration: 60000,
    },
  }
);

export default photoAnalyzerWorker;
```

```typescript
// src/lib/queue/workers/logistics-poller.worker.ts
import { Worker } from "bullmq";

const logisticsPollerWorker = new Worker(
  "logistics-poller",
  async (job) => {
    const { restaurantId, googlePlaceId } = job.data;

    // Poll Google Popular Times or similar API
    const traffic = await pollTrafficData(googlePlaceId);

    // Update Redis cache (hot path, no DB write needed for real-time)
    await updateTraffic(restaurantId, new Date().getDay(), new Date().getHours(), {
      busynessPct: traffic.busynessPct,
      waitMinutes: traffic.estimatedWait,
    });

    // Persist to DB periodically (every 4th poll)
    if (job.attemptsMade === 0 && Math.random() < 0.25) {
      await persistTrafficToDB(restaurantId, traffic);
    }

    return { busyness: traffic.busynessPct, wait: traffic.estimatedWait };
  },
  {
    connection: new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
      maxRetriesPerRequest: null,
    }),
    concurrency: 10,           // Lightweight API calls, higher concurrency
    limiter: {
      max: 60,                 // 60 polls per minute
      duration: 60000,
    },
  }
);

export default logisticsPollerWorker;
```

### 6.3 Scheduling Recurring Jobs

```typescript
// src/lib/queue/scheduler.ts
import { menuCrawlerQueue, reviewAggregatorQueue, logisticsPollerQueue, PRIORITY } from "./queues";
import { prisma } from "@/lib/db/client";

/**
 * Schedule recurring jobs for all active restaurants.
 * Call this on server startup or via a cron job.
 */
export async function scheduleRecurringJobs() {
  const restaurants = await prisma.restaurant.findMany({
    where: { isActive: true },
    select: { id: true, googlePlaceId: true, menuSource: true },
  });

  for (const restaurant of restaurants) {
    // Menu crawl: every 24 hours
    await menuCrawlerQueue.upsertJobScheduler(
      `menu-${restaurant.id}`,
      { pattern: "0 3 * * *" }, // 3 AM daily
      {
        name: "scheduled-menu-crawl",
        data: {
          restaurantId: restaurant.id,
          googlePlaceId: restaurant.googlePlaceId,
          source: restaurant.menuSource || "website",
        },
        opts: { priority: PRIORITY.NORMAL },
      }
    );

    // Review aggregation: every 3 days
    await reviewAggregatorQueue.upsertJobScheduler(
      `reviews-${restaurant.id}`,
      { pattern: "0 4 */3 * *" }, // 4 AM every 3 days
      {
        name: "scheduled-review-aggregation",
        data: { restaurantId: restaurant.id, googlePlaceId: restaurant.googlePlaceId },
        opts: { priority: PRIORITY.NORMAL },
      }
    );

    // Logistics polling: every 15 minutes during operating hours (8 AM - 11 PM)
    await logisticsPollerQueue.upsertJobScheduler(
      `traffic-${restaurant.id}`,
      { pattern: "*/15 8-23 * * *" }, // Every 15 min, 8 AM - 11 PM
      {
        name: "scheduled-traffic-poll",
        data: { restaurantId: restaurant.id, googlePlaceId: restaurant.googlePlaceId },
        opts: { priority: PRIORITY.HIGH },
      }
    );
  }

  console.log(`Scheduled jobs for ${restaurants.length} restaurants`);
}
```

### 6.4 Job Flows (Parent-Child Dependencies)

```typescript
// When crawling an area, create a flow: area crawl -> per-restaurant menu crawl -> photo analysis
import { FlowProducer } from "bullmq";

const flowProducer = new FlowProducer({
  connection: new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: null,
  }),
});

export async function crawlArea(lat: number, lng: number, radiusMiles: number) {
  // First, discover restaurants in the area
  const restaurantIds = await discoverRestaurants(lat, lng, radiusMiles);

  // Create a flow: for each restaurant, crawl menu then analyze photos
  const flow = await flowProducer.add({
    name: "area-crawl",
    queueName: "menu-crawler",
    data: { lat, lng, radiusMiles, totalRestaurants: restaurantIds.length },
    children: restaurantIds.map((id) => ({
      name: "restaurant-menu-crawl",
      queueName: "menu-crawler",
      data: { restaurantId: id },
      opts: { priority: PRIORITY.BULK },
      children: [
        {
          name: "restaurant-photo-analysis",
          queueName: "photo-analyzer",
          data: { restaurantId: id },
          opts: { priority: PRIORITY.LOW },
        },
      ],
    })),
  });

  return flow.job.id;
}
```

### 6.5 Dead Letter Queue and Monitoring

```typescript
// src/lib/queue/dlq.ts
import { Queue, QueueEvents } from "bullmq";

// Monitor failed jobs across all queues
export function setupDLQMonitoring() {
  const queues = ["menu-crawler", "photo-analyzer", "review-aggregator", "logistics-poller"];

  for (const queueName of queues) {
    const events = new QueueEvents(queueName, {
      connection: new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
        maxRetriesPerRequest: null,
      }),
    });

    events.on("failed", async ({ jobId, failedReason }) => {
      console.error(`[DLQ] ${queueName}/${jobId} permanently failed: ${failedReason}`);

      // Alert on repeated failures (integrate with your alerting system)
      const queue = new Queue(queueName);
      const failedJobs = await queue.getFailed(0, 100);
      if (failedJobs.length > 50) {
        console.error(`[ALERT] ${queueName} has ${failedJobs.length} failed jobs!`);
        // Send alert to Slack/PagerDuty/etc.
      }
    });
  }
}
```

---

## 7. Full-Text Search: tsvector vs Elasticsearch

### Verdict: PostgreSQL tsvector Is Sufficient for FoodClaw

| Factor | PostgreSQL FTS (tsvector) | Elasticsearch |
|--------|--------------------------|---------------|
| Scale threshold | Excellent up to ~1M documents | Needed at 10M+ or complex NLP |
| Operational complexity | Zero (same DB) | Separate cluster, sync pipeline, monitoring |
| Relevance tuning | ts_rank, ts_rank_cd, weights A-D | BM25, custom scoring, boosting, synonyms |
| Fuzzy matching | pg_trgm extension | Built-in |
| Autocomplete | pg_trgm + LIKE or prefix matching | Completion suggester |
| Join with main data | Native (same DB, same transaction) | Requires denormalization or application join |
| Cost | Free | ~$100-500/mo for managed cluster |
| Our scale | Thousands of dishes | Overkill |

### Implementation: Add tsvector to Dishes

```sql
-- Add generated tsvector column to dishes
ALTER TABLE dishes ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(category, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(ingredients_raw, '')), 'D')
  ) STORED;

-- GIN index on the tsvector column
CREATE INDEX idx_dishes_search ON dishes USING GIN(search_vector);

-- Trigram index for fuzzy/partial matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_dishes_name_trgm ON dishes USING GIN(name gin_trgm_ops);
```

### Search Queries

```sql
-- Full-text search with ranking
SELECT d.id, d.name, d.description, d.category,
       ts_rank(d.search_vector, websearch_to_tsquery('english', $1)) AS rank
FROM dishes d
WHERE d.search_vector @@ websearch_to_tsquery('english', $1)
  AND d.is_available = true
ORDER BY rank DESC
LIMIT 20;

-- Fuzzy search (typo-tolerant): "chickn parm" -> "chicken parmesan"
SELECT d.id, d.name,
       similarity(d.name, $1) AS sim
FROM dishes d
WHERE d.name % $1  -- % is the similarity operator from pg_trgm
  AND d.is_available = true
ORDER BY sim DESC
LIMIT 10;

-- Combined: try exact FTS first, fall back to fuzzy
WITH fts AS (
  SELECT d.id, d.name, d.description,
         ts_rank(d.search_vector, websearch_to_tsquery('english', $1)) AS rank,
         1 AS source
  FROM dishes d
  WHERE d.search_vector @@ websearch_to_tsquery('english', $1)
    AND d.is_available = true
),
fuzzy AS (
  SELECT d.id, d.name, d.description,
         similarity(d.name, $1) AS rank,
         2 AS source
  FROM dishes d
  WHERE d.name % $1
    AND d.is_available = true
    AND d.id NOT IN (SELECT id FROM fts)
)
SELECT * FROM fts
UNION ALL
SELECT * FROM fuzzy
ORDER BY source, rank DESC
LIMIT 20;
```

### Prisma Integration for Text Search

```typescript
// src/lib/search/text-search.ts
import { prisma } from "@/lib/db/client";

interface TextSearchResult {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  rank: number;
}

export async function searchDishByText(
  query: string,
  limit: number = 20
): Promise<TextSearchResult[]> {
  // Sanitize the query (websearch_to_tsquery handles most edge cases)
  const sanitized = query.trim();
  if (!sanitized) return [];

  const results = await prisma.$queryRaw<TextSearchResult[]>`
    WITH fts AS (
      SELECT d.id, d.name, d.description, d.category,
             ts_rank(d.search_vector, websearch_to_tsquery('english', ${sanitized})) AS rank
      FROM dishes d
      WHERE d.search_vector @@ websearch_to_tsquery('english', ${sanitized})
        AND d.is_available = true
    ),
    fuzzy AS (
      SELECT d.id, d.name, d.description, d.category,
             similarity(d.name, ${sanitized}) * 0.5 AS rank
      FROM dishes d
      WHERE d.name % ${sanitized}
        AND d.is_available = true
        AND d.id NOT IN (SELECT id FROM fts)
    )
    SELECT * FROM fts UNION ALL SELECT * FROM fuzzy
    ORDER BY rank DESC
    LIMIT ${limit}
  `;

  return results;
}
```

### Autocomplete with pg_trgm

```sql
-- Set the similarity threshold (default 0.3, lower = more fuzzy)
SET pg_trgm.similarity_threshold = 0.2;

-- Autocomplete as user types
SELECT DISTINCT name, similarity(name, $1) AS sim
FROM dishes
WHERE name % $1 AND is_available = true
ORDER BY sim DESC
LIMIT 8;
```

### Add to post-migrate.sql

```sql
-- Full-text search setup
CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE dishes ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(category, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(ingredients_raw, '')), 'D')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_dishes_search ON dishes USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_dishes_name_trgm ON dishes USING GIN(name gin_trgm_ops);
```

---

## 8. Database Migration Strategy

### 8.1 Prisma Migration Workflow

FoodClaw has a split migration approach: Prisma manages the schema, `post-migrate.sql` handles pgvector/extensions. This is the correct approach since Prisma cannot natively manage:
- pgvector columns and indexes
- Custom PostgreSQL functions and triggers
- earthdistance indexes
- Generated tsvector columns

### 8.2 Migration Checklist for New Features

```
For every schema change:

1. Modify schema.prisma
2. Run: npx prisma migrate dev --name <descriptive_name>
3. If adding pgvector/custom SQL, append to post-migrate.sql
4. Run: psql $DATABASE_URL -f scripts/post-migrate.sql
5. Run: npx prisma generate (regenerate client)
6. Test with: npx prisma migrate status
```

### 8.3 Safe Migration Patterns

**Adding a column with a default (zero-downtime)**:
```sql
-- Prisma generates this correctly:
ALTER TABLE dishes ADD COLUMN spice_level INTEGER DEFAULT 0;
-- PostgreSQL 11+ handles DEFAULT without table rewrite. Safe on large tables.
```

**Adding a NOT NULL column to existing table**:
```sql
-- Step 1: Add nullable column
ALTER TABLE dishes ADD COLUMN allergen_score INTEGER;

-- Step 2: Backfill in batches (do NOT update all rows at once)
DO $$
DECLARE
  batch_size INT := 1000;
  total INT;
BEGIN
  SELECT count(*) INTO total FROM dishes WHERE allergen_score IS NULL;
  RAISE NOTICE 'Backfilling % rows', total;

  LOOP
    UPDATE dishes SET allergen_score = 0
    WHERE id IN (
      SELECT id FROM dishes WHERE allergen_score IS NULL LIMIT batch_size
    );

    IF NOT FOUND THEN EXIT; END IF;
    RAISE NOTICE 'Batch complete, remaining: %', (SELECT count(*) FROM dishes WHERE allergen_score IS NULL);
    PERFORM pg_sleep(0.1); -- Small pause to reduce lock contention
  END LOOP;
END $$;

-- Step 3: Add NOT NULL constraint
ALTER TABLE dishes ALTER COLUMN allergen_score SET NOT NULL;
ALTER TABLE dishes ALTER COLUMN allergen_score SET DEFAULT 0;
```

**Creating indexes concurrently (zero-downtime)**:
```sql
-- ALWAYS use CONCURRENTLY for production indexes
-- Note: Cannot be run inside a transaction (Prisma migrations run in transactions!)
-- Must be run manually or in post-migrate.sql

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dishes_spice
  ON dishes (spice_level)
  WHERE spice_level > 0;
```

### 8.4 The post-migrate.sql Evolution Pattern

As `post-migrate.sql` grows, split it into versioned scripts:

```
scripts/
  post-migrate.sql          <- Always runs (idempotent, uses IF NOT EXISTS)
  migrations/
    001-pgvector-setup.sql
    002-dietary-expression-indexes.sql
    003-full-text-search.sql
    004-macro-embedding-trigger.sql
```

Master runner script:
```bash
#!/bin/bash
# scripts/run-post-migrate.sh
set -e

echo "Running post-migration scripts..."
for f in scripts/migrations/*.sql; do
  echo "  Running $f..."
  psql "$DATABASE_URL" -f "$f"
done
echo "Post-migration complete."
```

### 8.5 Updated post-migrate.sql (Complete)

```sql
-- scripts/post-migrate.sql
-- Idempotent: safe to run multiple times.
-- Run after: npx prisma migrate dev

-- ─── Extensions ────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─── pgvector Column ───────────────────────────────────
ALTER TABLE dishes ADD COLUMN IF NOT EXISTS macro_embedding vector(4);

-- ─── Full-Text Search Column ───────────────────────────
-- Note: GENERATED ALWAYS AS ... STORED requires the column to not exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dishes' AND column_name = 'search_vector'
  ) THEN
    ALTER TABLE dishes ADD COLUMN search_vector tsvector
      GENERATED ALWAYS AS (
        setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(category, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(ingredients_raw, '')), 'D')
      ) STORED;
  END IF;
END $$;

-- ─── Indexes ───────────────────────────────────────────

-- Dietary flags: GIN for @> containment queries
CREATE INDEX IF NOT EXISTS idx_dishes_dietary
  ON dishes USING GIN(dietary_flags);

-- Protein sort index
CREATE INDEX IF NOT EXISTS idx_dishes_protein
  ON dishes (protein_max_g DESC NULLS LAST);

-- Geospatial: GIST on earth coordinates
CREATE INDEX IF NOT EXISTS idx_restaurants_location
  ON restaurants USING GIST(ll_to_earth(latitude::float, longitude::float));

-- pgvector: HNSW index (replaces old IVFFlat)
DROP INDEX IF EXISTS idx_dish_macro_embedding;
CREATE INDEX IF NOT EXISTS idx_dish_macro_embedding
  ON dishes USING hnsw(macro_embedding vector_cosine_ops)
  WITH (m = 8, ef_construction = 32);

-- Full-text search: GIN on tsvector
CREATE INDEX IF NOT EXISTS idx_dishes_search
  ON dishes USING GIN(search_vector);

-- Trigram: fuzzy name matching
CREATE INDEX IF NOT EXISTS idx_dishes_name_trgm
  ON dishes USING GIN(name gin_trgm_ops);

-- Partial indexes for common dietary queries
CREATE INDEX IF NOT EXISTS idx_dishes_vegan_protein
  ON dishes (protein_max_g DESC NULLS LAST)
  WHERE (dietary_flags @> '{"vegan": true}') AND is_available = true;

CREATE INDEX IF NOT EXISTS idx_dishes_gf_calories
  ON dishes (calories_min ASC NULLS LAST)
  WHERE (dietary_flags @> '{"gluten_free": true}') AND is_available = true;

-- ─── Triggers ──────────────────────────────────────────

-- Auto-compute macro_embedding from macro columns
CREATE OR REPLACE FUNCTION compute_macro_embedding()
RETURNS TRIGGER AS $$
DECLARE
  cal_norm float;
  pro_norm float;
  carb_norm float;
  fat_norm float;
  magnitude float;
BEGIN
  IF NEW.calories_min IS NULL THEN
    NEW.macro_embedding := NULL;
    RETURN NEW;
  END IF;

  cal_norm  := COALESCE(NEW.calories_min, 0)::float / 1000.0;
  pro_norm  := COALESCE(NEW.protein_max_g, 0)::float / 50.0;
  carb_norm := COALESCE(NEW.carbs_max_g, 0)::float / 100.0;
  fat_norm  := COALESCE(NEW.fat_max_g, 0)::float / 50.0;

  magnitude := sqrt(cal_norm^2 + pro_norm^2 + carb_norm^2 + fat_norm^2);

  IF magnitude = 0 THEN
    NEW.macro_embedding := NULL;
  ELSE
    NEW.macro_embedding := ('[' ||
      (cal_norm / magnitude)::text || ',' ||
      (pro_norm / magnitude)::text || ',' ||
      (carb_norm / magnitude)::text || ',' ||
      (fat_norm / magnitude)::text || ']')::vector;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_dish_macro_embedding ON dishes;
CREATE TRIGGER trg_dish_macro_embedding
  BEFORE INSERT OR UPDATE OF calories_min, protein_max_g, carbs_max_g, fat_max_g
  ON dishes
  FOR EACH ROW
  EXECUTE FUNCTION compute_macro_embedding();

-- Backfill existing rows (triggers fire on UPDATE)
UPDATE dishes SET calories_min = calories_min WHERE calories_min IS NOT NULL;

-- ─── Performance Settings (run once per database) ──────

-- Recommend setting these in postgresql.conf or via ALTER SYSTEM:
-- ALTER SYSTEM SET shared_buffers = '256MB';           -- 25% of RAM
-- ALTER SYSTEM SET effective_cache_size = '768MB';      -- 75% of RAM
-- ALTER SYSTEM SET work_mem = '16MB';                   -- Per-operation sort memory
-- ALTER SYSTEM SET maintenance_work_mem = '128MB';      -- For CREATE INDEX, VACUUM
-- ALTER SYSTEM SET random_page_cost = 1.1;              -- SSD-optimized (default 4.0 is for HDD)
-- ALTER SYSTEM SET effective_io_concurrency = 200;      -- SSD-optimized
-- ALTER SYSTEM SET max_parallel_workers_per_gather = 2; -- Parallel query workers
```

---

## Appendix A: Complete Index Inventory

Run this to audit all indexes:

```sql
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexname::regclass)) AS index_size,
  idx_scan AS times_used,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes
ORDER BY tablename, indexname;
```

### Expected Indexes After This Guide

| Table | Index | Type | Purpose |
|-------|-------|------|---------|
| dishes | dishes_pkey | B-tree | Primary key |
| dishes | idx_dishes_restaurant | B-tree | FK lookup |
| dishes | idx_dishes_calories | B-tree | Calorie range filter |
| dishes | idx_dishes_dietary | GIN | Dietary flag containment (@>) |
| dishes | idx_dishes_protein | B-tree | Protein sort |
| dishes | idx_dish_macro_embedding | HNSW | Vector similarity search |
| dishes | idx_dishes_search | GIN | Full-text search |
| dishes | idx_dishes_name_trgm | GIN | Fuzzy name matching |
| dishes | idx_dishes_vegan_protein | B-tree (partial) | Vegan + protein sort |
| dishes | idx_dishes_gf_calories | B-tree (partial) | Gluten-free + calorie sort |
| restaurants | restaurants_pkey | B-tree | Primary key |
| restaurants | restaurants_google_place_id_key | B-tree | Unique constraint |
| restaurants | idx_restaurants_location | GIST | Geospatial radius queries |

---

## Appendix B: EXPLAIN ANALYZE Cheat Sheet

Always test query plans after index changes:

```sql
-- Show actual execution plan with timings and buffer usage
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT ...;

-- What to look for:
-- "Index Scan" or "Bitmap Index Scan" = good, using index
-- "Seq Scan" = bad if table is large, might need index
-- "Sort" with high cost = consider adding sorted index
-- "Hash Join" = fine for small tables, watch for large hash tables
-- "Nested Loop" = fine for small outer sets, bad for large
-- "actual rows" much higher than "rows" = bad statistics, run ANALYZE

-- Refresh statistics after bulk loads:
ANALYZE dishes;
ANALYZE restaurants;
```

---

## Appendix C: Monitoring Queries

```sql
-- Top 10 slowest queries (requires pg_stat_statements extension)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

SELECT query, calls, total_exec_time / calls AS avg_ms,
       rows / calls AS avg_rows
FROM pg_stat_statements
ORDER BY total_exec_time / calls DESC
LIMIT 10;

-- Unused indexes (candidates for removal)
SELECT indexrelname, idx_scan, pg_size_pretty(pg_relation_size(indexrelid))
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelname NOT LIKE '%_pkey'
  AND indexrelname NOT LIKE '%_key'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Table bloat check
SELECT schemaname, relname,
       n_live_tup, n_dead_tup,
       ROUND(100.0 * n_dead_tup / GREATEST(n_live_tup + n_dead_tup, 1), 1) AS dead_pct
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC;

-- Connection pool status
SELECT count(*), state FROM pg_stat_activity GROUP BY state;
```
