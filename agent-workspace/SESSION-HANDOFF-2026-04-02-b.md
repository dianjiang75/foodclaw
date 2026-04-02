# Session Handoff — 2026-04-02 (Session B)

## What This Session Did

This was the **"AGENTIC FOOD - main build"** session, picking up from the previous learning-schedule session's handoff doc. Over ~2 hours we fixed all test failures, resolved 6 CRITICAL + 5 MAJOR safety bugs, and ran 3 full learning rotation cycles implementing 20+ improvements.

---

## Current Metrics
- **TSC**: 0 errors
- **Lint**: 0 errors, 4 warnings (pre-existing: unused `_restaurantName`, `_address` in logistics stub)
- **Tests**: 150/150 pass (21 suites) — was 123/125 at start
- **Uncommitted changes**: 51 files, +978 / -370 lines

## ⚠️ IMPORTANT: Changes Are NOT Committed
All changes are in the working tree. First thing to do: review and commit.

---

## Phase 1: Test Fixes (123/125 → 150/150)

| Fix | Files |
|-----|-------|
| Jose ESM mock + moduleNameMapper | `__mocks__/jose.ts`, `jest.config.ts` |
| Auth tests rewritten (password + JWT + bcryptjs + rate limiter) | `__tests__/api/auth.test.ts` |
| Profile tests updated (JWT auth required) | `__tests__/api/profile.test.ts` |
| E2E tests updated (UUID IDs, password auth, apiSuccess wrapper) | `__tests__/integration/e2e.test.ts` |
| Vision outlier test made non-deterministic-safe | `__tests__/vision-analyzer/index.test.ts` |
| Logistics delivery stub restored | `src/lib/agents/logistics-poller/index.ts` |
| All tests updated for `{ success: true, data: ... }` response format | 7 test files |

## Phase 2: CRITICAL Safety Fixes

| # | Issue | Fix | File |
|---|-------|-----|------|
| 1 | Peanut sauce: "peanut" not matching "peanuts" keyword | Added singular+plural forms to ALL ALLERGEN_KEYWORDS | evaluator/index.ts |
| 2 | `allergens=` code path skipped ALLERGY_CRITICAL_MIN confidence gate | Added confidence gate + known-dish check to allergens path | evaluator/index.ts |
| 3 | Known allergen dishes (Pad Thai) bypassed at high confidence | Always add warning for known allergen dishes, regardless of confidence | evaluator/index.ts |
| 4 | Udon/tiramisu flagged gluten_free=true | Expanded KNOWN_ALLERGEN_DISHES list (udon, nabeyaki, tiramisu, pizza, gyoza, etc.) | evaluator/index.ts |
| 5 | Flag=true but description mentions allergen (e.g., "peanut sauce" + nut_free=true) | New check: exclude if flag contradicts description keywords | evaluator/index.ts |
| 6 | calorie_limit regression | Verified caloriesMax filter correct; fixed total_count reporting | orchestrator/index.ts |

## Phase 3: MAJOR Bug Fixes

| # | Issue | Fix | File |
|---|-------|-----|------|
| 1 | protein_min used proteinMaxG (too permissive) | Changed to proteinMinG | orchestrator/index.ts |
| 2 | max_wait off-by-one (16 min leaked through max_wait=15) | Changed `<=` to `<` | orchestrator/index.ts |
| 3 | total_count reported full DB count (87) not filtered | Fixed to use diversified.length | orchestrator/index.ts |
| 4 | Restaurant diversity interleaving broke sort order | Replaced round-robin with simple cap (preserves sort) | orchestrator/index.ts |
| 5 | 3-col grid too tight on phones <400px | Responsive: `grid-cols-1 min-[400px]:grid-cols-2 lg:grid-cols-3` | page.tsx |

## Phase 4: Learning Cycle Improvements (3 Full Rotations)

### Cycle 1: API + Frontend + Pipeline
| Improvement | Risk | Files |
|------------|------|-------|
| fetchWithRetry wired into menu crawler + crawl/area | GREEN | sources.ts, crawl/area/route.ts |
| Atomic rate limiter via Redis Lua script | GREEN | rate-limiter.ts |
| API response standardized to `{ success, data }` across 15+ routes | GREEN | 12 route files |
| Suggest endpoint rate limiting | GREEN | suggest/route.ts |
| WCAG 2.2 touch targets (44px minimum) | GREEN | page.tsx, category-pills.tsx, dish/[id]/page.tsx |
| Gemini responseSchema with SchemaType enums | GREEN | vision-analyzer/index.ts |
| USDA synonym map expanded (30 → 100+ entries) | GREEN | usda/client.ts |
| Preparation-aware calorie adjustment (frying +15-20%) | GREEN | usda/client.ts, vision-analyzer/index.ts |

### Cycle 2: Backend + Performance
| Improvement | Risk | Files |
|------------|------|-------|
| DB-level geo pre-filtering (earthdistance) in orchestrator | GREEN | orchestrator/index.ts |
| pgvector HNSW similarity search (replaces JS cosine) | YELLOW | similarity/index.ts |
| AVIF image format enabled | GREEN | next.config.ts |
| Wildcard image proxy `hostname: "**"` removed | GREEN | next.config.ts |
| AGENTS.md updated with 13 new discovered patterns | GREEN | AGENTS.md |

### Cycle 3: Code Quality
| Improvement | Risk | Files |
|------------|------|-------|
| CSS blur placeholders for image loading | GREEN | dish-card.tsx, dish/[id]/page.tsx |
| withRateLimit composable wrapper (deduped 4 routes) | GREEN | with-rate-limit.ts, 4 route files |
| Removed blanket cache invalidation (was O(N) SCAN) | GREEN | cache/index.ts |
| Photo queue priority (low-confidence dishes first) | GREEN | crawl-worker.ts |

---

## Files Created This Session
- `__mocks__/jose.ts` — Mock for ESM-only jose package in Jest
- `src/components/search-typeahead.tsx` — Debounced typeahead with keyboard nav + ARIA
- `agent-workspace/learning-digests/2026-04-02-api-frontend-pipeline.md`
- `agent-workspace/improvement-logs/2026-04-02-learning-cycle.md`
- `/tmp/nutriscout-start.sh` — Dev server launcher (workaround for path spaces)

## Files Heavily Modified
- `src/lib/evaluator/index.ts` — KNOWN_ALLERGEN_DISHES, ALLERGEN_KEYWORDS, allergens= confidence gate
- `src/lib/orchestrator/index.ts` — geo pre-filter, diversity cap, protein/wait/calorie fixes
- `src/lib/usda/client.ts` — 100+ synonyms, preparation multipliers
- `src/lib/agents/vision-analyzer/index.ts` — Gemini responseSchema, prep method pass-through
- `src/lib/middleware/rate-limiter.ts` — Atomic Lua script
- `src/lib/middleware/with-rate-limit.ts` — Composable wrapper
- `src/lib/similarity/index.ts` — pgvector HNSW rewrite with JS fallback
- `src/lib/cache/index.ts` — Removed blanket query invalidation
- `src/app/page.tsx` — Responsive grid, infinite scroll, search typeahead, touch targets

---

## Learning Rotation State
- **Current position**: `pipeline` (file: `agent-workspace/logs/learning-rotation.txt`)
- **Completed**: 3 full cycles (pipeline → backend → search → api → frontend → quality × 3)
- **Next cycle**: Start at pipeline, continue rotation

## Pending Research Findings (Not Yet Implemented)

### From Frontend Research (YELLOW risk — deferred):
1. Convert page.tsx to RSC with Suspense streaming (Impact 9, Effort 7)
2. Add Suspense boundaries to dish detail page (Impact 8, Effort 6)
3. Blur placeholders via blurDataURL (needs DB schema change — CSS approach done instead)

### From Pipeline Research (YELLOW risk — deferred):
1. BullMQ FlowProducer for crawl-to-vision job chaining (Impact 7, Effort 5)
2. Multi-photo ensemble analysis in pipeline (Impact 7, Effort 4)

### From Backend Research (YELLOW risk — deferred):
1. Add 'simple' tsvector column for foreign food terms (Impact 7, Effort 4)

### From API Research (YELLOW risk — deferred):
1. Google Places API v2 migration (Impact 9, Effort 6, Urgency 8)

## Known Issues (from BACKLOG.md — updated by user-test agent)
- See `agent-workspace/user-test-reports/BACKLOG.md` for latest
- Most CRITICAL/MAJOR items from the 2026-04-02 test run were fixed this session
- Remaining items are mostly MINOR (seed data quality, missing features)

## How to Continue

1. Open a new chat labeled "AGENTIC FOOD"
2. Say: "Read nutriscout/agent-workspace/SESSION-HANDOFF-2026-04-02-b.md and pick up where we left off"
3. First priority: **review and commit** the 51 uncommitted files
4. Then: continue learning rotation from `pipeline`
5. Consider implementing the YELLOW-risk deferred items (RSC streaming, Google Places v2)
6. Run `/user-test` to validate all fixes against the 5 mock customer personas

## Dev Server Note
The `preview_start` tool cannot work with this project due to the space in "agentic food app" directory name. Use `npm run dev` via Bash instead, or rename the directory to remove spaces.
