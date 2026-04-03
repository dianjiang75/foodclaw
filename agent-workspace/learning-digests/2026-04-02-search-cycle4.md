# Search Learning Digest -- Cycle 4 (2026-04-02)

Focus: full-text search, typeahead/autocomplete, search relevance, ranking, pg_trgm fuzzy matching.

---

## 1. Current State of Search Code

### 1a. Full-Text Search (`src/lib/db/geo.ts`, lines 54-103)

**How it works today:**
- `fullTextSearchDishes()` converts user query to tsquery with `&` (AND) between words.
- Tries `english` dictionary first; falls back to `simple` dictionary if zero results.
- The `simple` fallback re-computes tsvectors inline (lines 87-96) instead of using the stored `search_vector` column.
- Uses `ts_rank()` for ranking (frequency-based, no proximity).

**search_vector column definition** (from `scripts/post-migrate.sql`, lines 12-17):
```sql
setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
setweight(to_tsvector('english', coalesce(category, '')), 'C')
```
Weights: name=A, description=B, category=C. Good hierarchy.

**CONFLICT**: The migration file (`prisma/migrations/20260401010000_add_fulltext_search/migration.sql`) defines `search_vector` WITHOUT weights and WITHOUT category:
```sql
to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
```
The `post-migrate.sql` version (with weights + category) takes precedence if run last, but this is fragile.

### 1b. Search Orchestrator (`src/lib/orchestrator/index.ts`)

**Search flow:**
1. Check semantic cache (lines 26-48)
2. Full-text search via `fullTextSearchDishes()`, fallback to ILIKE (lines 68-93)
3. Geo pre-filter via earthdistance (lines 112-141)
4. Prisma query with all filters combined (lines 147-178)
5. Distance calculation, logistics lookup (lines 180-203)
6. Dietary verification via evaluator (line 278)
7. Multi-factor relevance sort or explicit sort (lines 281-307)
8. Restaurant diversity cap -- max 3 per restaurant (lines 309-310)
9. Cache and paginate (lines 312-331)

**Relevance scoring** (`relevanceScore()`, lines 446-460):
- 35% rating, 25% proximity, 15% has-review, 15% macro-confidence, 10% has-photo
- Does NOT incorporate text-match relevance at all. If a user searches "chicken tikka" and gets results via full-text search, the FTS rank score is completely discarded after the ID filtering step.

### 1c. Suggest/Typeahead (`src/app/api/search/suggest/route.ts`)

- Prefix match via `startsWith` (ILIKE under the hood), then contains fallback if < 3 results.
- No fuzzy matching, no trigram similarity.
- No result grouping by category or cuisine.
- No highlight/bold of matched text.
- Comment on line 13 explicitly says: "Future: upgrade to pg_trgm for fuzzy/typo-tolerant matching."

### 1d. Search UI Component (`src/components/search-typeahead.tsx`)

- 200ms debounce (line 80) -- good, within best-practice range (150-300ms).
- Abort controller for canceling in-flight requests (lines 39-41) -- good.
- Keyboard navigation with ArrowUp/Down/Enter/Escape -- good accessibility.
- ARIA attributes (combobox, listbox, activedescendant) -- good.
- No client-side caching of suggestions.
- No "recent searches" or "popular searches" when input is empty.

---

## 2. Backlog Issues Relevant to Search (GREEN/YELLOW)

| # | Severity | Issue | Root Cause | Search-Relevant? |
|---|----------|-------|------------|-------------------|
| B1 | MAJOR | Protein sort non-monotonic at tail (20.2g before 31.4g) | Restaurant diversity cap (`applyRestaurantDiversityCap`) runs AFTER sort, filtering out higher-protein dishes from over-represented restaurants, leaving lower-protein dishes visible | YES -- ranking/ordering |
| B2 | MAJOR | Rating sort breaks at position 16 | Same diversity cap artifact | YES -- ranking/ordering |
| B3 | MAJOR | Similar dishes returns empty array | pgvector broken | Tangential |
| B4 | MINOR | No safety disclaimer for allergy users | UX gap | Tangential |

The CRITICAL issues (allergen logic, calorie regression, evaluator bugs) are outside search scope -- they live in the evaluator and dietary filtering.

---

## 3. Research Findings

### 3a. PostgreSQL Full-Text Search Tuning

**ts_rank vs ts_rank_cd**: The current code uses `ts_rank()` (frequency only). For food search with multi-word queries like "spicy chicken bowl", `ts_rank_cd()` (Cover Density) would produce better rankings because it rewards proximity of matched terms. A dish named "Spicy Chicken Rice Bowl" should rank higher than a dish with "Spicy" in the name and "chicken" buried in a long description paragraph.

**Normalization flags**: `ts_rank` accepts a normalization integer. Current code passes no normalization (defaults to 0 = no normalization). For a food app where dish names are short and descriptions vary in length, normalization flag `2` (divide by document length) or `32` (divide by rank + 1) would prevent long descriptions from unfairly dominating.

**Weight array**: `ts_rank` and `ts_rank_cd` accept a `{D,C,B,A}` weight array. The stored search_vector already has A/B/C weights, but the `ts_rank()` call in `geo.ts` line 72 does not pass a custom weight array, so it uses defaults `{0.1, 0.2, 0.4, 1.0}`. These defaults are reasonable but could be tuned: for food search, name matches (A) should dominate even more -- consider `{0.05, 0.1, 0.3, 1.0}`.

Sources:
- [PostgreSQL Docs: Controlling Text Search](https://www.postgresql.org/docs/current/textsearch-controls.html)
- [Sling Academy: ts_rank Guide](https://www.slingacademy.com/article/postgresql-full-text-search-a-guide-to-ts-rank-for-relevance-ranking/)

### 3b. pg_trgm for Fuzzy Matching / Typo Tolerance

**What it solves**: Users type "chiken tikka" or "caeser salad" -- the current search returns zero results because tsvector requires exact lexeme matches. pg_trgm breaks strings into 3-character windows and scores similarity, tolerating typos.

**Implementation pattern for suggest endpoint**:
```sql
SELECT name, similarity(name, $1) AS sim
FROM dishes
WHERE name % $1   -- % operator uses similarity threshold
  AND is_available = true
ORDER BY sim DESC
LIMIT 5;
```

**GIN vs GiST index for trigrams**:
- GIN: faster lookups, slower inserts. Best for read-heavy suggest endpoint.
- GiST: supports KNN distance ordering (`ORDER BY name <-> $1`). Better for "did you mean?" with ranked results.
- For the suggest endpoint, GiST with `gist_trgm_ops` and `<->` distance operator is ideal.

**Similarity threshold**: Default is 0.3. For food names, 0.25 may be better since many dish names are short (fewer trigrams = lower similarity scores even for near-matches).

**Hybrid approach**: Use tsvector for the main search (handles stemming, weights, boolean logic) and pg_trgm as a fallback when tsvector returns zero results, or always for the suggest/typeahead endpoint.

Sources:
- [PostgreSQL Docs: pg_trgm](https://www.postgresql.org/docs/current/pgtrgm.html)
- [Poespas Blog: Full-Text Search with Fuzzy Matching](https://blog.poespas.me/posts/2025/02/15/postgresql-full-text-search-fuzzy-matching/)
- [DEV Community: Fuzzy String Matching Tutorial](https://dev.to/talemul/fuzzy-string-matching-in-postgresql-with-pgtrgm-trigram-search-tutorial-2hc6)

### 3c. Typeahead / Autocomplete Best Practices

**Debounce**: 200ms (current) is good. Industry range is 150-300ms. Below 150ms generates too many requests; above 300ms feels sluggish.

**Client-side caching**: The current component does NOT cache previous responses. If a user types "chick", then "chicken", then backspaces to "chick", it re-fetches. A simple in-memory Map keyed by query prefix would eliminate redundant requests. SessionStorage is another option for persistence across re-renders.

**Result grouping**: Current suggestions show dish name + restaurant. Grouping by category (e.g., "Entrees", "Appetizers") or by cuisine type would help users scan results faster, especially when multiple restaurants serve similar dishes.

**Empty state**: When the search box is focused but empty, showing "Popular searches" or "Recent searches" is a high-value UX pattern that the current implementation does not have.

**Highlighting**: Bolding the matched substring within suggestion text is standard UX. The current component renders plain text.

Sources:
- [Frontend System Design: Autocomplete](https://medium.com/frontend-interviews/frontend-system-design-design-autocomplete-bee371882ad1)
- [GreatFrontend: Autocomplete System Design](https://www.greatfrontend.com/questions/system-design/autocomplete)

### 3d. Search Ranking for Food Discovery

**Key insight**: The current `relevanceScore()` ignores the FTS rank entirely. When a user searches "chicken tikka", all matched dishes get the same text-relevance treatment. The FTS rank should be a primary signal (perhaps 30-40% weight) in the relevance score when a text query is present.

**Multi-signal ranking** (industry pattern for food apps):
1. Text relevance (FTS rank) -- 35% when query present, 0% when browsing
2. Rating/popularity -- 25%
3. Proximity -- 20%
4. Freshness/availability signals (wait time, open now) -- 10%
5. Data completeness (photo, reviews, macro confidence) -- 10%

**Personalization**: iFood's 2024-2025 results showed 97% uplift in conversion by personalizing collection recommendations. FoodClaw could eventually incorporate user dietary preferences and order history into ranking, but this is a future consideration.

Sources:
- [iFood: Personalized Dish and Restaurant Recommendations](https://arxiv.org/html/2508.03670v1)
- [Shaped.ai: Modern Ranking Models](https://www.shaped.ai/blog/modern-ranking-models)

---

## 4. Actionable Items (GREEN/YELLOW Priority)

### GREEN -- High impact, moderate effort

#### G1. Incorporate FTS rank into relevance scoring
**Problem**: `fullTextSearchDishes()` returns `{ id, rank }` but the orchestrator only uses `id` (line 74 of `orchestrator/index.ts`). The rank score is discarded.
**Fix**:
- File: `src/lib/orchestrator/index.ts`, lines 68-93
- Pass the FTS rank map through to `relevanceScore()`.
- Change `relevanceScore()` (line 446) to accept an optional `ftsRank` parameter.
- When `query.query` is present, weight FTS rank at ~30% and reduce other weights proportionally.
**Effort**: ~30 lines changed. No schema changes.

#### G2. Switch from ts_rank to ts_rank_cd with normalization
**Problem**: `ts_rank()` ignores proximity. "Spicy Chicken Bowl" and a dish with "spicy" in name + "chicken" in a long description get similar scores.
**Fix**:
- File: `src/lib/db/geo.ts`, lines 69-78
- Replace `ts_rank(search_vector, ...)` with `ts_rank_cd(search_vector, ..., 2)` (normalization=2 divides by document length).
- Also apply in the `simple` fallback path (lines 84-100).
**Effort**: ~4 lines changed. No schema changes. Requires the stored search_vector to have position info (it does, since `to_tsvector` stores positions by default).

#### G3. Fix the search_vector column definition conflict
**Problem**: Migration SQL and post-migrate.sql define `search_vector` differently. If migration runs without post-migrate, search misses category matches and has no weights.
**Fix**:
- File: `prisma/migrations/20260401010000_add_fulltext_search/migration.sql`
- Update to match the post-migrate.sql weighted definition with category included.
- Or add a new migration that ALTERs the column to match.
**Effort**: Small SQL change. Requires `prisma migrate` re-run.

#### G4. Fix diversity cap breaking sort monotonicity (BACKLOG B1/B2)
**Problem**: `applyRestaurantDiversityCap()` (line 469) filters out higher-ranked dishes from over-represented restaurants, leaving lower-ranked items visible. This makes protein sort and rating sort appear non-monotonic.
**Fix**:
- File: `src/lib/orchestrator/index.ts`, lines 469-483
- Move the diversity cap BEFORE the final sort for explicit sorts (protein, rating, distance, wait_time). Only apply diversity for the default "best match" sort where interleaving is expected.
- Alternative: apply diversity cap, then re-sort. The current approach of cap-then-no-resort is the bug.
**Effort**: ~15 lines. Reorder the cap and sort calls conditionally.

### YELLOW -- Medium impact, moderate effort

#### Y1. Add pg_trgm fuzzy matching to the suggest endpoint
**Problem**: Typing "chiken" or "caeser" returns zero suggestions. The comment in the code (line 13 of `suggest/route.ts`) already flags this as a TODO.
**Fix**:
- Enable `pg_trgm` extension: add `CREATE EXTENSION IF NOT EXISTS pg_trgm;` to post-migrate.sql.
- Create GiST trigram index: `CREATE INDEX idx_dishes_name_trgm ON dishes USING GIST(name gist_trgm_ops);`
- File: `src/app/api/search/suggest/route.ts` -- replace ILIKE queries with:
  ```sql
  SELECT DISTINCT name, category, similarity(name, $1) AS sim
  FROM dishes
  WHERE is_available = true AND name % $1
  ORDER BY sim DESC LIMIT 5
  ```
- Set `pg_trgm.similarity_threshold` to 0.25 for short food names.
**Effort**: ~40 lines + 1 SQL migration.

#### Y2. Add pg_trgm fallback to main full-text search
**Problem**: When both `english` and `simple` tsvector searches return nothing, the ILIKE fallback (lines 77-91 of `orchestrator/index.ts`) does substring matching but cannot handle typos.
**Fix**:
- File: `src/lib/db/geo.ts` -- add a third fallback using `similarity()` or `word_similarity()`.
- Only trigger when both tsvector searches return 0 results.
- Use `word_similarity()` rather than `similarity()` because it matches substrings (e.g., "chicken" within "Grilled Chicken Salad").
**Effort**: ~25 lines in geo.ts.

#### Y3. Add client-side suggestion caching to SearchTypeahead
**Problem**: Backspacing re-fetches the same query. No caching between keystroke sequences.
**Fix**:
- File: `src/components/search-typeahead.tsx`
- Add a `useRef<Map<string, Suggestion[]>>` cache inside the component.
- Before fetching, check if the query is already in the cache.
- Limit cache size to ~50 entries (LRU or simple eviction).
**Effort**: ~20 lines.

#### Y4. Add search term highlighting in suggestions
**Problem**: Suggestion dropdown shows plain text. Users cannot quickly see why a result matched.
**Fix**:
- File: `src/components/search-typeahead.tsx`, lines 198-199
- Add a `highlightMatch(text: string, query: string)` utility that wraps the matched substring in `<mark>` or a styled `<span>`.
- Apply to the dish name in the suggestion list.
**Effort**: ~15 lines.

#### Y5. Add "Popular searches" empty state
**Problem**: Focused empty search box shows nothing. Users get no guidance.
**Fix**:
- File: `src/components/search-typeahead.tsx`
- When `value` is empty and input is focused, show a hardcoded or API-driven list of popular categories: "High Protein", "Under 500 Cal", "Vegan", etc.
- Clicking a popular search fills the search box and triggers the search.
**Effort**: ~30 lines in the component + optional API endpoint.

---

## 5. Recommended Priority Order

1. **G1** (FTS rank in relevance scoring) -- biggest search quality win, no schema changes
2. **G2** (ts_rank_cd + normalization) -- quick 4-line change, measurably better multi-word ranking
3. **G4** (diversity cap sort fix) -- fixes two MAJOR backlog items
4. **Y1** (pg_trgm for suggest) -- directly addresses the TODO in the code, major UX improvement
5. **G3** (search_vector conflict) -- prevents future confusion, small effort
6. **Y3** (client-side cache) -- reduces API calls, snappier UX
7. **Y4** (highlight matching) -- small effort, polish
8. **Y2** (pg_trgm fallback for main search) -- good but lower priority since main search already has ILIKE fallback
9. **Y5** (popular searches) -- nice to have, requires design decision

---

## 6. Out of Scope (Noted for Other Agents)

- CRITICAL evaluator bugs (allergen keywords, dietary flag accuracy) -- evaluator agent
- Calorie limit regression -- orchestrator filters, but it is a data/evaluator issue
- Delivery data being null -- logistics poller agent
- pgvector similar dishes broken -- vector search agent
- Keto flag not in schema -- schema/evaluator agent
