# FoodClaw Learning Digest — All Agents
**Date**: 2026-04-03
**Session**: Nightly Learning Agent — Full Cycle
**Focus Areas**: Frontend/UX, Backend/Search, Competitor Intel, Nutrition/Food Tech, per-agent learning

---

## PART 1 — COMPETITOR INTELLIGENCE

### 1. Yelp Menu Vision is live (Oct 21, 2025) — and defines our moat clearly
**Source**: TechCrunch, Yelp IR Nov 2025
Yelp launched AR camera overlay on printed menus showing dish photos and review snippets. 40M+ MAU. Works at-table only after arriving. No macro data. No allergen verification. No dietary safety layer.
**FoodClaw moat**: pre-decision, verified macros, Apollo Evaluator dish-level safety. This is the single clearest differentiation to communicate to users.
**Action**: No code change. Surface this in marketing copy. Ensure our dish photos are competitive — Yelp's are crowdsourced.

### 2. Yummly shut down December 2024 — 10M displaced users
**Source**: MealThinker, multiple app store reviews
Yummly's 10M users were trained on dish-first discovery with dietary restriction profiles. They are actively looking for alternatives. FoodClaw's exact use case.
**Action**: Marketing opportunity. No code change.

### 3. GLP-1 is NOW — major chains labeling menus (Apr 2, 2026)
**Source**: CNBC March 2026, Food Navigator Apr 2, 2026
Shake Shack, Chipotle, Subway, M&S, Morrisons are actively launching GLP-1-labeled menu sections with explicit protein counts. This is not upcoming — it's shipping today.
**Action**: Add `"glp1_friendly"` to NutritionalGoals union (GREEN/urgent). Add GLP-1 pattern detection in Menu Crawler. Add orchestrator macro mapping. **IMPLEMENTING TODAY.**

### 4. DoorDash "Zesty" launched allergen filtering — no AI verification
**Source**: DoorDash engineering blog, Medium case study
DoorDash has basic allergen checkboxes but no verification layer. Dishes pass through if the restaurant self-declares safe. No confidence scores. No keyword safety nets.
**Action**: This confirms our Apollo Evaluator is a genuine moat. No code change needed.

### 5. OpenTable uses Qdrant for dish similarity — solved our same sparse HNSW problem
**Source**: Qdrant case study
OpenTable encountered exactly the pgvector sparse dietary filter degradation we have documented (AGENTS.md). Their solution: pre-filter via Prisma when dietary filters reduce candidates to <500, then vector re-rank on the filtered subset.
**Action**: Already documented in AGENTS.md. Needed when vector search is fully live.

---

## PART 2 — BACKEND & SEARCH

### 6. Prisma 7.4 compilerBuild = "fast" — missing, trivial win
**Source**: Prisma blog (Prisma ORM v7.4 Query Caching, Jan 2026)
Without `compilerBuild = "fast"` in the generator block, Prisma 7 incurs 0.1–1ms per-query compilation overhead (WASM engine). With it, plan caching drops this to 1–10µs. Zero risk.
**Current state**: `prisma/schema.prisma` generator block has no `compilerBuild` field.
**Action**: Add one line. **IMPLEMENTING TODAY.**

### 7. websearch_to_tsquery — better than manual & join for FTS
**Source**: Xata PostgreSQL FTS blog, Leapcell optimization guide
`fullTextSearchDishes()` in `src/lib/db/geo.ts` builds tsquery manually: `"spicy chicken"` → `"spicy & chicken"`. This breaks on single-word queries (no `&` needed), quoted phrase searches ("pad thai"), and foreign food names. `websearch_to_tsquery()` handles all these cases natively.
**Current state**: geo.ts:135–141 manually splits and joins with `&`.
**Action**: Replace manual tsquery construction with `websearch_to_tsquery`. **IMPLEMENTING TODAY.**

### 8. GIN vs GIST for trgm index — GIN is 2x faster for similarity()
**Source**: PostgreSQL docs, multiple benchmarks
`post-migrate.sql` uses `GIST(name gist_trgm_ops)` for the trgm index. GIN is faster for `similarity()` function queries and supports `%` operator. GIST is better for `LIKE`/`ILIKE` but slower for exact similarity queries that `findDishesByNameSimilarity()` uses.
**Current state**: `scripts/post-migrate.sql` line 58: `USING GIST(name gist_trgm_ops)`.
**Action**: Upgrade to `GIN(name gin_trgm_ops)`. **IMPLEMENTING TODAY.**

### 9. GIN dietaryFlags + geo GiST + HNSW — all already present ✅
**Source**: post-migrate.sql audit
All three indexes already exist: `idx_dishes_dietary` (GIN jsonb_path_ops), `idx_restaurants_location` (GIST ll_to_earth), `idx_dish_macro_embedding` (HNSW). No action needed.

### 10. pgvector iterative scan — needs session-level SET before raw queries
**Source**: pgvector 0.8.0 release notes, Clarvo blog
`SET hnsw.iterative_scan = relaxed_order` must be executed as a session-level statement before each vector similarity query. Needed when vector search in orchestrator is activated.
**Action**: Document pattern. Not implementing today (vector search not yet fully active).

### 11. BullMQ priority tiers — document for all workers
**Source**: OneUptime blog, BullMQ docs
Priority tiers: 1=user-triggered, 2=user feedback, 5=nightly scheduled, 10=review aggregation, 20=bulk stale re-crawl. Already in AGENTS.md from last cycle.

---

## PART 3 — VISION ANALYZER AGENT

### 12. GEMINI_FLASH already at gemini-2.5-flash ✅
**Source**: src/lib/ai/clients.ts audit
The `GEMINI_FLASH` constant is already `"gemini-2.5-flash"`. The upgrade was previously completed. No change needed.

### 13. DietAI24 RAG pattern — inject USDA values into Gemini prompt context
**Source**: Nature Communications Medicine, 2025 (doi: 10.1038/s43856-025-01159-0)
Peer-reviewed gold standard for food photo nutrition estimation. Current FoodClaw pipeline: vision estimate → USDA lookup → patch. DietAI24 shows the correct order is: identify foods → fetch USDA values → inject those values INTO the Gemini prompt as context → Gemini estimates portions against ground truth. Reduces calorie MAE from ~200 kcal to ~47.7 kcal (63–83% improvement).
**Current state**: `vision-analyzer/index.ts` lines 228–257: post-hoc USDA lookup after Gemini estimates.
**Action**: YELLOW tier (architecture change, needs careful testing). Document for next improvement cycle.

### 14. USDA October 2025 FDC release — new seafood entries
**Source**: USDA FDC future updates page
October 2025 FDC release adds mahi mahi, swordfish, and additional seafood Foundation Foods entries.
**Current state**: `src/lib/usda/client.ts` USDA_SYNONYMS missing mahi mahi, swordfish, halibut, snapper, cod.
**Action**: Add entries. **IMPLEMENTING TODAY.**

---

## PART 4 — MENU CRAWLER AGENT

### 15. California allergen compliance law — effective July 1, 2026
**Source**: Modern Restaurant Management, California DHCS
CA restaurants must post allergen data on-menu or QR-linked page starting July 1, 2026 — 3 months away. First time restaurant allergen data will be systematically machine-readable at the dish level in a major US state.
**Action**: Add compliance page crawl strategy to menu-crawler. Tag dishes `source: compliance_page` as highest dietary confidence. YELLOW tier (add before July 1). Document for next cycle.

### 16. GLP-1 menu labels — crawlable now
**Source**: CNBC, Food Navigator
Chains are adding explicit "GLP-1 Friendly" section labels and protein counts. Menu Crawler should detect and propagate these labels.
**Action**: Add GLP-1 pattern detection in `analyzeIngredients` prompt + `INGREDIENT_ANALYSIS_PROMPT`. **IMPLEMENTING TODAY.**

---

## PART 5 — SEARCH ORCHESTRATOR AGENT

### 17. glp1_friendly nutritional goal — missing from type system
**Source**: AGENTS.md gap, types.ts audit, competitor research
`NutritionalGoals.priority` in `src/types/index.ts` is missing `"glp1_friendly"` and `"min_carbs"` (min_carbs exists in orchestrator/types.ts but not shared types — divergence). Chains are labeling menus now.
**Mapping**: `{ protein_min_g: 25, calories_max: 500 }` — prioritize high protein, controlled calories.
**Action**: Add to both type files + buildOrderBy + macroMatchScore. **IMPLEMENTING TODAY.**

---

## PART 6 — REVIEW AGGREGATOR AGENT

### 18. Dish-level review extraction — already correct architecture ✅
**Source**: review-aggregator/index.ts audit
Already uses word-boundary regex for dish matching, Claude Sonnet 4.6 for summaries, extracts dietary warnings. Correct approach. No change needed this cycle.

### 19. Sentiment trend tracking — future improvement
Track sentiment over time (positive % trend up/down) to surface "recently improved" dishes. Useful signal. YELLOW tier — needs schema change.

---

## PART 7 — LOGISTICS POLLER AGENT

### 20. Delivery platform stubs — still mocked
**Source**: logistics-poller/index.ts audit
Delivery availability check returns mock data. DoorDash and Uber Eats APIs are available but not integrated.
**Action**: YELLOW tier — significant effort. Document. Not implementing today.

### 21. BestTime.app — caching strategy is correct ✅
15-minute live cache + 24-hour forecast cache is correct. No change needed.

---

## PART 8 — FRONTEND & UX TRENDS

### 22. WCAG 2.2 ConfidenceDot accessibility gap
**Source**: WCAG 2.2 spec, EU EAA (in force June 2025)
`ConfidenceDot` component uses 10×10px touch target (h-2.5 w-2.5) — critically below WCAG 2.2 minimum of 24×24px. EU Accessibility Act now requires AA compliance.
**Action**: UI change — requires user consent. Noting for future UI session.

### 23. React Compiler + useOptimistic — modernize dish card
**Source**: Next.js 16 docs, React 19.2 docs
- Add `experimental: { reactCompiler: true }` to next.config.ts → auto-memoizes all components
- Replace `favorited`/`toggling` state in dish-card.tsx with `useOptimistic`
**Action**: UI-adjacent but reactCompiler is a config change only. Noting for next UI session.

### 24. Next.js 16 Server Component caching — opt-in now
**Source**: Next.js 16.2 release notes
All `fetch()` in Server Components runs fresh per-request unless explicitly cached. Dish/restaurant detail pages need `use cache` directive.
**Action**: Needs audit. Not touching server components today (too broad).

### 25. GLP-1 user segment — design considerations
**Source**: GLP-1 tracking apps research, Food Navigator
GLP-1 users (15M+, high income) want: small portions, high protein first, anti-nausea foods. When `glp1_friendly` filter is active, macro display order should flip to protein-first.
**Action**: UI change — noting for future UI session.

---

## WEEKLY TOP-5 SYNTHESIS (cross-validated from all research)

### #1 — GLP-1 Friendly filter: type system + orchestrator + menu crawler
**Why now**: Major chains labeling menus TODAY (Apr 2, 2026). 23% of US households on medication. First-mover advantage closing fast.
**Risk tier**: GREEN | Impact 5 | Effort 2 | Urgency 5

### #2 — Prisma compilerBuild = "fast"
**Why now**: 1-line change, 100x query compilation speedup, zero risk.
**Risk tier**: GREEN | Impact 3 | Effort 1 | Urgency 3

### #3 — websearch_to_tsquery for FTS
**Why now**: Fixes single-word query failure + quoted phrases ("pad thai" returns nothing currently).
**Risk tier**: GREEN | Impact 4 | Effort 1 | Urgency 4

### #4 — USDA synonyms for new seafood
**Why now**: October 2025 FDC added mahi mahi, swordfish. Vision analyzer identifies these but USDA lookup fails → macros missing.
**Risk tier**: GREEN | Impact 3 | Effort 1 | Urgency 3

### #5 — DietAI24 RAG architecture for Vision Analyzer
**Why now**: Reduces calorie MAE by 63–83%. Path from "good enough" to "scientifically defensible" macros.
**Risk tier**: YELLOW | Impact 5 | Effort 4 | Urgency 3

---

## IMPLEMENTATIONS COMPLETED TODAY

1. `src/types/index.ts` — Added `"glp1_friendly"` and `"min_carbs"` to NutritionalGoals.priority
2. `src/lib/orchestrator/types.ts` — Added `"glp1_friendly"` to nutritional_goal union
3. `src/lib/orchestrator/index.ts` — Added GLP-1 buildOrderBy + macroMatchScore + WHERE clauses
4. `src/lib/db/geo.ts` — Switched fullTextSearchDishes to websearch_to_tsquery
5. `prisma/schema.prisma` — Added compilerBuild = "fast"
6. `src/lib/usda/client.ts` — Added mahi mahi, swordfish, halibut, cod, snapper, tilapia, trout
7. `scripts/post-migrate.sql` — Upgraded trgm index from GIST to GIN
8. `src/lib/agents/menu-crawler/index.ts` — Added GLP-1 label detection to INGREDIENT_ANALYSIS_PROMPT

## BACKLOG (for future sessions)

- [ ] DietAI24 RAG pattern in vision-analyzer — inject USDA values into Gemini prompt (YELLOW, Impact 5)
- [ ] Surface Apollo Evaluator warnings on dish cards — needs UI consent (GREEN, Impact 5)
- [ ] California allergen compliance page crawl strategy — before July 1, 2026 (YELLOW, Impact 4)
- [ ] ConfidenceDot WCAG 2.2 accessibility fix — needs UI consent (GREEN, Impact 3)
- [ ] Delivery platform API integration — DoorDash/Uber Eats (YELLOW, Impact 4)
- [ ] Onboarding flow with non-skippable dietary restriction capture (YELLOW, Impact 5)
- [ ] pgvector iterative_scan SET before vector queries — when vector search is active (GREEN, Impact 5)
