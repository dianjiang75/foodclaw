# User Test Backlog

Issues discovered by mock customer agents. The `/improve` agent reads this file and prioritizes CRITICAL/MAJOR issues.

## Open Issues

| Date | Severity | Persona | Issue | Target File(s) | Status |
|------|----------|---------|-------|-----------------|--------|
| 2026-04-02 | **CRITICAL** | Alice | Nabeyaki Udon flagged gluten_free=true — udon is wheat flour, life-threatening | `src/lib/evaluator/index.ts`, seed data | Open |
| 2026-04-02 | **CRITICAL** | Alice | Black Cocoa Tiramisu flagged gluten_free=true — ladyfingers are wheat | `src/lib/evaluator/index.ts`, seed data | Open |
| 2026-04-02 | **CRITICAL** | Alice | Summer Rolls with "peanut sauce" passes allergens=peanuts — plural/singular mismatch in ALLERGEN_KEYWORDS | `src/lib/evaluator/index.ts` | Open |
| 2026-04-02 | **CRITICAL** | Alice | Pad Thai at 0.95 confidence passes nut_free with NO warning — KNOWN_ALLERGEN_DISHES bypassed at high confidence | `src/lib/evaluator/index.ts` | Open |
| 2026-04-02 | **CRITICAL** | Pete | calorie_limit=500 shows dishes with 806 cal — regression from yesterday's fix | `src/lib/orchestrator/index.ts` | Open |
| 2026-04-02 | **CRITICAL** | Alice | allergens= code path skips ALLERGY_CRITICAL_MIN (0.85) confidence gate — weaker than diet= path | `src/lib/orchestrator/index.ts` | Open |
| 2026-04-02 | MAJOR | Pete | Protein sort non-monotonic at tail (20.2g before 31.4g) — restaurant grouping artifact | `src/lib/orchestrator/index.ts` | Open |
| 2026-04-02 | MAJOR | Pete | protein_min filter uses protein_max_g not protein_min_g — dishes with 24g protein pass 30g filter | `src/lib/orchestrator/index.ts` | Open |
| 2026-04-02 | MAJOR | Sam | max_wait=15 leaks dish at 16 min — off-by-one boundary | `src/lib/orchestrator/index.ts` | Open |
| 2026-04-02 | MAJOR | Sam | total_count reports full DB count (87), not filtered count | `src/lib/orchestrator/index.ts` | Open |
| 2026-04-02 | MAJOR | Sam | delivery=true is a no-op — all results have delivery: null | `src/lib/agents/logistics-poller/` | Open |
| 2026-04-02 | MAJOR | Fiona | Similar dishes returns empty array for top dishes — vector search broken | `src/lib/orchestrator/`, pgvector | Open |
| 2026-04-02 | MAJOR | Fiona | Rating sort breaks at position 16 — same grouping artifact as other sorts | `src/lib/orchestrator/index.ts` | Open |
| 2026-04-02 | MAJOR | Pete | diet=keto returns 0 results silently — keto flag not in schema | schema, evaluator | Open |
| 2026-04-02 | MINOR | Emma | photo_count: 0 but photos array has 1 entry — stale field | `src/app/api/dishes/[id]/route.ts` | Open |
| 2026-04-02 | MINOR | Emma | Dish detail missing distance_miles and cuisine_type | `src/app/api/dishes/[id]/route.ts` | Open |
| 2026-04-02 | MINOR | Alice | No safety disclaimer in filter drawer for allergy users | `src/components/filter-drawer.tsx` | Open |
| 2026-04-02 | MINOR | Fiona | All reviews are identical templates, not dish-specific | seed data / review aggregator | Open |
| 2026-04-01 | MINOR | Fiona | Only 1 photo per dish — no carousel variety | scripts/seed-manhattan.ts | Open |

## Resolved Issues

| Date | Severity | Persona | Issue | Resolved By | Resolution Date |
|------|----------|---------|-------|-------------|-----------------|
| 2026-04-01 | MAJOR | Emma | Category filters return 0 results — cuisine names case mismatch | Capitalize cuisine IDs before Prisma query | 2026-04-01 |
| 2026-04-01 | MAJOR | Pete | Calorie cap leaks high-cal dishes — was checking caloriesMin not caloriesMax | Changed filter to use caloriesMax | 2026-04-01 (REGRESSED 2026-04-02) |
| 2026-04-01 | MAJOR | Sam | Wait time data 0% — seed only created ±2hr window | Seed all 7 days × 9 key hours | 2026-04-01 |
| 2026-04-01 | MAJOR | Sam | Null wait times sort first | Already fixed with ?? Infinity sort | 2026-04-01 |
| 2026-04-01 | MAJOR | Fiona | No reviews — was seeded but stale cache hid them | Re-seeded, confirmed in API response | 2026-04-01 |
| 2026-04-01 | MINOR | Emma | 3-col grid too tight on very small phones (<400px) | Responsive grid: 1-col < 400px, 2-col < lg, 3-col lg+ | 2026-04-02 |
| 2026-04-01 | MINOR | Alice | Pad Thai at 0.87 nut_free confidence — borderline for peanut-heavy dish | Added known-allergen dish list: Pad Thai nut_free needs 0.9+ | 2026-04-02 |
| 2026-04-01 | MINOR | Fiona | Photo carousel dot click doesn't scroll — visual only | src/app/dish/[id]/page.tsx | **Resolved** |
| 2026-04-01 | MINOR | Fiona | Similar dishes hardcodes NYC lat/lng instead of user location | src/app/dish/[id]/page.tsx | **Resolved** |
| 2026-04-01 | MINOR | Fiona | NULL ratings not sorted last — dishes without reviews pollute top | src/lib/orchestrator/index.ts | **Resolved** |
| 2026-04-01 | MINOR | Pete | highlight="calories" does nothing on macro bar (dead code path) | src/components/macro-bar.tsx | **Resolved** |
| 2026-04-01 | MINOR | Pete | Compact macro bar ignores highlight prop entirely | src/components/macro-bar.tsx | **Resolved** |
