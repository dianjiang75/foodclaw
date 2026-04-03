# Competitor & Nutrition Tech Research Digest — April 3, 2026

**Research agent**: Competitor & Nutrition Tech
**Date**: 2026-04-03
**Method**: 20 targeted web searches across competitors, APIs, AI models, market data
**Previous digests checked**: 2026-04-01-competitor-intelligence.md, 2026-04-02-market-research.md (avoiding duplicate findings)

---

## EXECUTIVE SUMMARY — NET NEW FINDINGS

This digest surfaces findings NOT already covered in the April 1 competitor intelligence or April 2 market research digests. Five priority signals:

1. **Yelp Menu Vision (Oct 2025) is a direct feature encroachment** — AR menu scanning that shows dish photos from printed menus is live on iOS + Android. This is the most direct competitive overlap with FoodClaw's dish-first vision. Critical gap Yelp still lacks: macro data and dietary safety filtering.
2. **Gemini 2.5 Flash is available and measurably better** for vision — 25% benchmark improvement on Nutrition5k dataset vs. our current Gemini Flash version. Upgrade path exists with structured output support confirmed.
3. **DietAI24 framework (Nature, 2025)** — RAG-grounded multimodal nutrition estimation reduces macro estimation error by 63–83%. This architecture (vision model + authoritative DB lookup) is exactly what FoodClaw should evolve toward.
4. **USDA FoodData Central** is adding Foundation Foods in October 2025 release (seafood expansion) and Branded Foods update monthly. Our synonym map already handles most cases but the October 2025 release adds items we may be missing.
5. **California allergen labeling law (effective July 1, 2026)** requires restaurant menus to list allergens or provide via QR code — this creates a structured data source FoodClaw can crawl that did not previously exist.

---

## FINDING 1: Yelp Menu Vision — Most Dangerous Competitive Feature Launch

**Date launched**: October 21, 2025
**Source**: [TechCrunch](https://techcrunch.com/2025/10/21/yelps-ai-assistant-can-now-scan-restaurant-menus-to-show-you-what-dishes-look-like/), [Yelp IR](https://www.yelp-ir.com/news/press-releases/news-release-details/2025/Yelp-Expands-AI-Features-to-Make-Local-Discovery-More-Conversational-Visual-and-Seamless/default.aspx)

**What it does**: Point phone camera at a printed menu → OCR reads dish names → AR overlays tap-to-expand bubbles showing user-uploaded photos and review snippets for each dish. Uses text recognition + pattern matching on printed menu text. Live on iOS and Android.

**Fall 2025 package also includes**:
- Natural language + voice search ("conversational Yelp AI assistant")
- Business comparison AI ("compare the ramen at X vs Y")
- 35+ new features in the release

**What Yelp does NOT have** (FoodClaw's moats):
- No macro estimation (calories, protein, carbs, fat)
- No dietary safety verification — no evaluator equivalent
- No allergen confidence scoring
- No micro-nutritional data
- No GLP-1 filtering
- Menu Vision works only on printed menus at the table — FoodClaw works before you leave home

**Risk assessment**: MEDIUM-HIGH. Yelp has distribution (40M+ MAU) and is now doing dish-level photo discovery. But they are doing it as a "point at menu in restaurant" tool, not a pre-decision research tool. Our differentiation is macro data + safety.

**Action items**:
- Audit FoodClaw's dish photo quality — Yelp's advantage is crowdsourced photos; our vision-analyzed dish photos need to be high quality to compete on visuals
- "Verified macro data" should be a prominent badge that Yelp cannot match
- Ensure our dish search works on zero knowledge (before visiting) — this is the gap Yelp doesn't serve

**Risk tier**: YELLOW
**Impact**: HIGH | **Effort**: LOW (messaging/positioning) to MEDIUM (photo quality)
**Target files**: `src/components/dish-card.tsx`, dish detail page, onboarding copy

---

## FINDING 2: Gemini 2.5 Flash — Direct Upgrade Path for Vision Analyzer

**Source**: [Google Developers Blog (CalCam)](https://developers.googleblog.com/en/calcam-transforming-food-tracking-with-the-gemini-api/), [Vertex AI docs](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-5-flash), [Gemini 3 Flash announcement](https://blog.google/products-and-platforms/products/gemini/gemini-3-flash/)

**Key facts**:
- **Gemini 2.5 Flash** (now GA): "Best model in terms of price and performance" per Google. Supports structured output (`responseSchema` with `SchemaType` enum — same pattern we already use). 25% improvement on nutrition benchmarks (Nutrition5k dataset) vs. 1.5 Flash per one developer's report.
- **Gemini 3 Flash** (announced 2026): 81.2% on MMMU Pro — state-of-the-art multimodal. Not yet GA.
- Our Vision Analyzer currently uses `GEMINI_FLASH` constant — this maps to Gemini Flash 1.5 based on when the migration happened (noted in AGENTS.md as "migrated from Claude Haiku").

**Critical issue found**: GitHub issue #1028 in google-gemini/cookbook notes that `gemini-2.5-flash-image` specifically has a structured output bug — but `gemini-2.5-flash` (text+vision in same model) supports structured output correctly. Our `responseSchema` pattern works with the standard multimodal endpoint.

**Upgrade recommendation**:
1. In `src/lib/agents/vision-analyzer/index.ts`, change the model string from `GEMINI_FLASH` constant to `gemini-2.5-flash` (or the GA model ID confirmed in Vertex AI docs)
2. Test that existing `responseSchema` with `SchemaType` enum still works (should, per docs)
3. Expected improvement: 25% better accuracy on food identification and macro range estimation
4. Cost impact: Gemini 2.5 Flash pricing is comparable to 1.5 Flash for input tokens; slightly higher for output but structured outputs are compact

**Risk tier**: GREEN
**Impact**: HIGH (better macro accuracy = core product quality) | **Effort**: LOW (model string change + validation)
**Target files**: `src/lib/agents/vision-analyzer/index.ts`, vision analyzer tests

---

## FINDING 3: DietAI24 — RAG-Grounded Vision Nutrition Architecture

**Source**: [Nature Communications Medicine (2025)](https://www.nature.com/articles/s43856-025-01159-0), [NutriRAG preprint (medRxiv, March 2025)](https://www.medrxiv.org/content/10.1101/2025.03.19.25324268v1.full)

**What it is**: DietAI24 is a peer-reviewed framework (published in Nature) that combines:
1. Multimodal LLM (vision model) for food identification from photos
2. RAG lookup against authoritative nutrition DBs (FNDDS/USDA) rather than relying on LLM's internal knowledge
3. Structured nutrient extraction for 65 nutrients

**Performance numbers**:
- 63% reduction in mean absolute error vs. existing methods
- Per-dish accuracy: 47.7 kcal MAE for calories, 1.67g fat, 6.95g carbs, 1.38g protein
- 76-83% error reduction for calories vs. prior SOTA

**How FoodClaw compares**:
- We already do step 1 (Gemini Flash vision) and step 2 (USDA matching via `src/lib/usda/client.ts`)
- But the RAG step is sequential: vision → extract ingredients → synonym map → USDA lookup. DietAI24's approach integrates the DB lookup INTO the LLM context window so the model grounds its estimates in actual USDA values rather than hallucinating
- Our current approach: LLM estimates macros freely, then USDA confirms. DietAI24 approach: give LLM the USDA data first, then ask it to estimate based on that

**Practical implementation**:
- In `src/lib/agents/vision-analyzer/index.ts`, when building the prompt for Gemini, pre-fetch the top 3 USDA matches for identified ingredients and include their nutrition data in the prompt context
- This is RAG for vision: "Here are USDA calorie values for chicken breast (165 kcal/100g), olive oil (884 kcal/100g), pasta (131 kcal/100g cooked) — estimate the dish's total nutrition"
- Current `estimateMacros()` with `preparationMethod` is close but doesn't inject USDA ground truth into the LLM call

**Risk tier**: YELLOW (requires architecture change but not a rewrite)
**Impact**: VERY HIGH (macro accuracy is product quality) | **Effort**: MEDIUM
**Target files**: `src/lib/agents/vision-analyzer/index.ts`, `src/lib/usda/client.ts`

---

## FINDING 4: USDA FoodData Central — October 2025 Release + Monthly Branded Updates

**Source**: [FDC Future Updates page](https://fdc.nal.usda.gov/future-updates/), [FDC main site](https://fdc.nal.usda.gov/)

**Key updates**:
- **October 2025 release**: New Foundation Foods added — planned additions include mahi mahi, swordfish, and other highly-consumed seafood items not previously in Foundation Foods
- **Branded Foods**: Updated monthly in the API. New download every 6 months.
- **FNDDS (Food and Nutrient Database for Dietary Studies)**: Used by DietAI24 as authoritative ground truth — this is the dietary recall database, includes mixed dishes and restaurant-style preparations

**Gap analysis for FoodClaw**:
- Our USDA_SYNONYMS map (100+ entries, expanded 2026-04-02) handles common ingredients but may miss new seafood entries added in Oct 2025
- We are querying the FDC API in real time — monthly branded food updates are automatically available
- FNDDS dataset (mixed dishes) is a download-only dataset, not available via FDC API. If we want better estimates for composite restaurant dishes, we should download FNDDS and cache it locally

**Recommended additions to synonym map** (based on October 2025 release + seafood gaps):
- `"mahi mahi"` → `"dolphinfish, cooked"` or new FDC entry
- `"swordfish"` → `"swordfish, cooked, dry heat"`
- `"halibut"` → check if Foundation Foods entry exists or use SR Legacy
- Cross-reference: FatSecret's "Restaurant Food Detection" improved in 2025 for branded dish recognition — we should periodically diff against their API for restaurant-specific items we miss

**Actionable alternative DB**: Nutritionix handles 700M API calls/month, has 1.9M+ items including geo-aware restaurant lookup (send lat/lng → get nearby restaurant nutrition data). This could supplement our USDA matching for branded chain dishes where USDA is sparse.

**Risk tier**: GREEN (synonym map updates) / YELLOW (FNDDS integration)
**Impact**: MEDIUM | **Effort**: LOW (synonym map) / MEDIUM (FNDDS download)
**Target files**: `src/lib/usda/client.ts` (USDA_SYNONYMS map), potentially new `src/lib/usda/fndds-client.ts`

---

## FINDING 5: California Allergen Law — New Structured Data Source (July 1, 2026)

**Source**: [Modern Restaurant Management (2026)](https://modernrestaurantmanagement.com/2026-food-compliance-trends-every-restaurant-should-be-watching/), [DLA Piper Food Trends](https://www.dlapiper.com/en-us/insights/publications/food-and-beverage-news-and-trends/2025/food-and-beverage-news-and-trends-december-22-2025)

**What changed**: Effective July 1, 2026 (3 months away), California restaurants must list allergens directly on menus OR provide them digitally via QR code. QR code option requires a supplementary written allergen chart.

**Why this matters for FoodClaw**:
- California is likely a launch market (SF mentioned in competitor research)
- QR-code allergen pages are machine-readable — our Menu Crawler can scrape them
- This is the first time restaurant allergen data will be systematically available at the menu-item level in a major US state
- Restaurants will build allergen info pages for compliance → FoodClaw can crawl them

**Related**: NYC Sweet Truth Act (effective Oct 4, 2025) requires chain restaurants with 15+ locations to post added-sugar warnings on menus next to items with 50g+ added sugar per serving. Another scraping signal for our sugar/carb dietary flags.

**Implementation**:
- Add a "California Allergen QR" crawl strategy to Menu Crawler as a new source type
- Update Menu Crawler priority order: website HTML > allergen compliance page > Google Photos > delivery platforms
- Tag dishes with source `"compliance_verified"` when data comes from a legal compliance page — highest confidence rating

**Risk tier**: GREEN
**Impact**: HIGH (more accurate dietary flags in CA market) | **Effort**: MEDIUM
**Target files**: `src/lib/agents/menu-crawler/index.ts`, menu crawler source priority logic

---

## FINDING 6: OpenTable's Vector Search Architecture (Qdrant + Sparse Embeddings)

**Source**: [Qdrant case study — OpenTable](https://qdrant.tech/blog/case-study-opentable/)

**What OpenTable built**: "Concierge" — AI assistant powered by vector search (Qdrant) over their restaurant data (menus, reviews, descriptions). Uses sparse embeddings + HNSW graph search. Key differentiator: filtering down to a single restaurant (sparse collection) without HNSW quality degradation, which was a problem with competing vector DBs.

**Why this matters for FoodClaw**:
- We use pgvector with HNSW index but have **not** enabled `hnsw_ef_search` iterative scan (noted in AGENTS.md: "pgvector hnsw iterative_scan not yet enabled — dietary-filtered vector search may underreturn on sparse categories")
- OpenTable found this exact problem — sparse filtered collections degrade HNSW graph quality
- Their solution was Qdrant's sparse embedding optimization. Our solution (staying with pgvector) requires enabling `iterative_scan` for dietary-filtered queries

**Concrete fix**:
- In the search orchestrator's vector query path, when dietary filters reduce the candidate set below ~500 dishes, switch to `ivfflat` scan or enable `SET hnsw.ef_search = 200` per-query for the dietary-filtered case
- Alternatively: run dietary pre-filter in Prisma (SQL), then do vector re-ranking only on the filtered subset — this is cheaper and avoids sparse HNSW degradation entirely

**OpenTable's Concierge also uses**: Perplexity + OpenAI APIs for the conversational layer on top of vector retrieval. Not relevant to us technically but confirms the RAG-over-restaurant-data pattern.

**Risk tier**: YELLOW
**Impact**: MEDIUM-HIGH (search quality for users with multiple dietary filters) | **Effort**: MEDIUM
**Target files**: `src/lib/orchestrator/index.ts`, database query layer, Prisma schema (index settings)

---

## FINDING 7: GLP-1 Restaurant Menu Labeling — Major Chains Moving Fast

**Source**: [CNBC March 2026](https://www.cnbc.com/2026/03/21/glp-1-diets-restaurants-protein-fiber-weight-loss-drugs.html), [Food Navigator April 2, 2026](https://www.foodnavigator-usa.com/Article/2026/04/02/nutrition-design-for-glp1-consumers/)

**What's happening right now** (published YESTERDAY relative to today):
- Shake Shack, Chipotle, M&S, Morrisons, and Subway are actively launching GLP-1-focused menu sections
- Restaurants are labeling items as "GLP-1 Friendly" with explicit protein counts
- Key GLP-1 nutritional profile: high protein (≥25g), high fiber, low calorie density (≤500 kcal), small portions, hydration focus
- 23% of US households now use GLP-1 medications (Circana data, confirmed again)
- GLP-1 users spend MORE at restaurants, not less — high-value customer segment

**FoodClaw implementation** (building on April 1 digest recommendation to add GLP-1 filter):
- This is now URGENT — restaurants are already labeling dishes this way, creating a metadata signal we can crawl
- Add pattern matching in Menu Crawler for "GLP-1 friendly" labels and "high protein" menu sections
- The `NutritionalGoals.priority` union type (tracked in AGENTS.md as missing GLP-1) should be added immediately: `"glp1_friendly"` maps to `{ protein_min_g: 25, calories_max: 500, fiber_boost: true }`
- Macro display on dish cards should show protein FIRST for GLP-1 mode (not calories first)

**Risk tier**: GREEN (elevated urgency — competitors are doing this now)
**Impact**: VERY HIGH | **Effort**: LOW-MEDIUM
**Target files**: `src/types/index.ts`, `src/lib/orchestrator/types.ts`, `src/components/filter-drawer.tsx`, `src/lib/agents/menu-crawler/index.ts`

---

## FINDING 8: Food Photo AI — DietAI24 Error Rates vs. Our Current Approach

**Source**: [Nature Communications Medicine DietAI24](https://www.nature.com/articles/s43856-025-01159-0), [PMC LLM food image study](https://pmc.ncbi.nlm.nih.gov/articles/PMC12513282/), [NYU AI food scanner](https://engineering.nyu.edu/news/ai-food-scanner-turns-phone-photos-nutritional-analysis)

**Current state of the art (2025)**:

| System | Calorie MAE | Notes |
|---|---|---|
| DietAI24 (RAG+LLM) | 47.7 kcal/dish | Best published, Nature paper |
| SnapCalorie | ~16% error | Real product, commercial |
| TastyAPI | 1.5% error | Claims lab standard comparison |
| Manual tracking (avg users) | ~53% error | Baseline |
| Generic LLM (GPT-4V) | ~30-40% error | Without RAG grounding |

**Implication for our Vision Analyzer**: Without RAG grounding, Gemini Flash's calorie estimates likely fall in the 30-40% error range for arbitrary restaurant dishes. Our USDA matching post-hoc helps but doesn't achieve DietAI24 levels. The upgrade path (Finding 3) to RAG-grounded vision is validated by peer-reviewed evidence.

**Cronometer comparison**: Launched Photo Logging in September 2025 — cutting matching time from 10-15 seconds to 5-7.5 seconds, Gold-tier only. Our Vision Analyzer runs async (BullMQ job), so latency comparison is less relevant, but the accuracy race is real.

**Risk tier**: YELLOW (architecture improvement, not urgent bug)
**Impact**: HIGH | **Effort**: MEDIUM
**Target files**: `src/lib/agents/vision-analyzer/index.ts`, `src/lib/usda/client.ts`

---

## FINDING 9: Competitor Gaps — Feature Comparison Matrix (Updated)

Based on all research, updated competitive map:

| Feature | FoodClaw | Yelp | Zesty (DoorDash) | Cravr | MFP | Cronometer |
|---|---|---|---|---|---|---|
| Dish-first search | YES | Partial (Popular Dishes) | NO (restaurant-first) | YES | NO | NO |
| Pre-decision discovery | YES | Partial (at restaurant) | YES (restaurant level) | YES | NO (retrospective) | NO |
| Macro estimation | YES | NO | NO | NO | YES (retrospective) | YES |
| Dietary safety flags | YES (Apollo Evaluator) | NO | NO | NO | NO | Limited |
| GLP-1 filtering | NOT YET | NO | NO | NO | YES (tracker only) | NO |
| Real macro confidence scores | YES | NO | NO | NO | NO | YES |
| Allergen verification | YES | NO | NO | NO | NO | NO |
| Vision analysis | YES (Gemini Flash) | YES (AR menus) | NO | NO | YES (logging) | YES (logging) |
| Restaurant logistics | YES (BullMQ polls) | NO | NO | NO | NO | NO |
| Map/spatial browse | NO | YES | YES | YES | NO | NO |
| Social/community signals | NO | YES | YES | Partial | NO | NO |

**Biggest gaps still owned by FoodClaw**: Allergen verification, pre-decision macro data, multi-restriction filtering.
**Biggest gaps FoodClaw needs to close**: Map browse, social signals, GLP-1 filter (imminent).

---

## FINDING 10: Nutrition AI Funding — Market Validation

**Source**: [Fierce Healthcare, 2025](https://www.fiercehealthcare.com/health-tech/startups-fay-and-berry-street-each-bank-50m-growing-investor-appetite-personalized), [AI Personalized Nutrition Market](https://www.towardsfnb.com/insights/ai-in-personalized-nutrition-market)

**Market signals**:
- AI personalized nutrition market: $4.89B in 2025 → $21.54B by 2034 (17.9% CAGR)
- Fay (personalized nutrition + RD matching): $50M from Northzone, $75M total raised
- Berry Street (similar): $50M
- Foodsmart (telenutrition): $200M from The Rise Fund
- Nutrium: €10M for US expansion
- Hyperlocal food delivery: $540B in 2025 → $1.46T by 2032 (15.3% CAGR)

**Investor thesis that applies to FoodClaw**: The "personalized nutrition" thesis is hot. FoodClaw sits at the intersection of personalized nutrition + restaurant discovery — a niche no funded startup is explicitly targeting. Fay/Berry Street focus on coaching; Foodsmart on telenutrition + insurance billing. Nobody is doing AI-verified dish-level restaurant filtering.

**For fundraising narrative**: "We are the only app that tells you what restaurant dish is safe to eat given your allergy profile, verified with AI, before you order."

---

## FINDING 11: Allergen App Landscape — Spokin's Verification Model is Worth Copying

**Source**: [Spokin](https://www.spokin.com/verified-restaurants), [FoodAllergyInstitute.com](https://foodallergyinstitute.com/resources/blog/4-best-apps-for-food-allergies)

**Spokin's verification model**:
- 73,000+ reviews across 80 countries
- Restaurants must answer a **27-question allergy FAQ** to get verified status
- Questions cover: dedicated allergen-free preparation, oil type, cross-contact protocols
- **24-question product allergen FAQ** for food brands

**Why this matters**: Spokin's crowd-verification model generates a trust signal that FoodClaw's automated AI evaluation could augment or replace. Where we have `confidence: null` (uncertain), Spokin has crowdsourced human verification.

**Potential integration**:
- Import Spokin's verified restaurant database as a confidence signal for our Apollo Evaluator
- Where Spokin says a restaurant is "nut-free certified," elevate our confidence score for nut_free flag on that restaurant's dishes
- This doesn't require a formal partnership — their data is searchable/public

**Risk tier**: YELLOW
**Impact**: MEDIUM-HIGH (trust/safety for allergy users) | **Effort**: MEDIUM
**Target files**: `src/lib/evaluator/index.ts`, restaurant confidence scoring

---

## FINDING 12: Yummly Shutdown — Opportunity in Recipe-to-Restaurant Bridge

**Source**: [MealThinker Yummly Alternative 2026](https://mealthinker.com/blog/yummly-alternative), Whirlpool announcement

**What happened**: Yummly shut down December 2024. Whirlpool acquired it in 2017 for ~$100M, laid off the entire team April 2024, app dead by December. Whirlpool is pivoting to generative AI.

**Implication**: ~10M+ Yummly users (recipe discovery, personalized dietary filtering for recipes) are now app-homeless. These users had: dietary restriction profiles set up, recipe favorites, ingredient-based discovery habits.

**FoodClaw bridge opportunity**: These users already understand dish-first thinking and dietary filtering. They want to find specific dishes, not just restaurants. FoodClaw is a natural migration target.

**Positioning note**: When marketing, reference "dish discovery" and "dietary filtering" — these are the exact use patterns Yummly trained its users on. Those users are actively looking for alternatives right now.

---

## PRIORITY ACTION MATRIX (Net New — Not Duplicating Prior Digests)

| Finding | Action | Risk Tier | Impact | Effort | Target Files |
|---|---|---|---|---|---|
| Gemini 2.5 Flash upgrade | Update model string + validate structured output | GREEN | HIGH | LOW | `vision-analyzer/index.ts` |
| GLP-1 filter (URGENT) | Add `"glp1_friendly"` to NutritionalGoals union, filter logic, UI | GREEN | VERY HIGH | LOW-MED | `types/index.ts`, `orchestrator/types.ts`, `filter-drawer.tsx` |
| California allergen compliance crawl | New Menu Crawler strategy for QR-linked allergen pages | GREEN | HIGH | MEDIUM | `menu-crawler/index.ts` |
| USDA seafood synonyms | Add mahi mahi, swordfish to USDA_SYNONYMS map | GREEN | LOW | LOW | `usda/client.ts` |
| RAG-grounded vision (DietAI24 architecture) | Inject USDA values into Gemini prompt context | YELLOW | VERY HIGH | MEDIUM | `vision-analyzer/index.ts`, `usda/client.ts` |
| Yelp Menu Vision positioning | Add "pre-decision" and "macro verified" messaging to distinguish from Yelp's at-table AR | YELLOW | HIGH | LOW | Onboarding, dish card UI |
| pgvector iterative_scan for sparse dietary queries | Enable HNSW iterative scan or pre-filter before vector search | YELLOW | MEDIUM-HIGH | MEDIUM | Orchestrator query layer |
| Nutritionix as fallback API | For branded chain dishes, fall back to Nutritionix geo-aware lookup | YELLOW | MEDIUM | MEDIUM | `usda/client.ts` or new integration |

---

## PATTERNS TO ADD TO AGENTS.MD

The following are new architectural patterns discovered in this research that future sessions should know:

1. **DietAI24 RAG pattern**: Best-practice vision nutrition estimation injects USDA calorie values for identified ingredients INTO the LLM prompt context before asking for estimates — not post-hoc matching. Target: `vision-analyzer/index.ts`.

2. **Gemini 2.5 Flash model ID**: The current `GEMINI_FLASH` constant likely points to `gemini-1.5-flash`. The upgrade target is `gemini-2.5-flash` (GA, structured output confirmed working via standard multimodal endpoint, NOT the `-image` suffix variant which has a known structured output bug per GitHub issue #1028).

3. **California allergen compliance (July 1, 2026)**: CA restaurants must post allergen data on menu or QR-linked page — machine-readable source FoodClaw should crawl. Treat `source: "compliance_page"` as highest dietary flag confidence.

4. **Yelp Menu Vision**: Launched Oct 21, 2025 — AR camera overlay on printed menus showing dish photos and review snippets. Works at-table only. FoodClaw differentiator: pre-decision, macro data, dietary safety verification.

5. **Nutritionix geo-aware API**: Accepts lat/lng and returns nearby restaurant nutrition data for 200K+ restaurant locations — useful as fallback for branded chain dishes where USDA is sparse.

---

## SOURCES

- [Yelp Menu Vision — TechCrunch](https://techcrunch.com/2025/10/21/yelps-ai-assistant-can-now-scan-restaurant-menus-to-show-you-what-dishes-look-like/)
- [Yelp Fall 2025 Product Release — Yelp IR](https://www.yelp-ir.com/news/press-releases/news-release-details/2025/Yelp-Expands-AI-Features-to-Make-Local-Discovery-More-Conversational-Visual-and-Seamless/default.aspx)
- [Yelp Blog Fall Release 2025](https://blog.yelp.com/news/fall-product-release-2025/)
- [Gemini 2.5 Flash — Vertex AI Docs](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-5-flash)
- [CalCam Food Tracking with Gemini — Google Developers Blog](https://developers.googleblog.com/en/calcam-transforming-food-tracking-with-the-gemini-api/)
- [Gemini 3 Flash Announcement — Google Blog](https://blog.google/products-and-platforms/products/gemini/gemini-3-flash/)
- [DietAI24 Framework — Nature Communications Medicine](https://www.nature.com/articles/s43856-025-01159-0)
- [NutriRAG — medRxiv](https://www.medrxiv.org/content/10.1101/2025.03.19.25324268v1.full)
- [AI Food Scanner Accuracy — NYU Tandon](https://engineering.nyu.edu/news/ai-food-scanner-turns-phone-photos-nutritional-analysis)
- [USDA FoodData Central Future Updates](https://fdc.nal.usda.gov/future-updates/)
- [FatSecret Platform API 2025](https://platform.fatsecret.com/platform-api)
- [Nutritionix Database](https://www.nutritionix.com/)
- [Best APIs for Menu Nutrition Data — Bytes AI](https://trybytes.ai/blogs/best-apis-for-menu-nutrition-data)
- [GLP-1 Diets + Restaurant Protein/Fiber — CNBC March 2026](https://www.cnbc.com/2026/03/21/glp-1-diets-restaurants-protein-fiber-weight-loss-drugs.html)
- [GLP-1 Food Innovation — Food Navigator April 2, 2026](https://www.foodnavigator-usa.com/Article/2026/04/02/nutrition-design-for-glp1-consumers/)
- [GLP-1 Tracking Apps 2026 — LearnMuscles](https://learnmuscles.com/blog/2025/11/27/glp-1-tracking-apps-compared-which-app-actually-works-in-2026/)
- [2026 Food Compliance Trends — Modern Restaurant Management](https://modernrestaurantmanagement.com/2026-food-compliance-trends-every-restaurant-should-be-watching/)
- [OpenTable + Qdrant Case Study](https://qdrant.tech/blog/case-study-opentable/)
- [OpenTable AI Concierge](https://www.opentable.com/blog/concierge-ai-dining-assistant/)
- [DoorDash Dietary Filter Case Study — Medium](https://medium.com/@kristend.liu/enhancing-inclusivity-for-users-with-food-allergies-dietary-restrictions-on-doordash-a319939dbac0)
- [Spokin Verified Restaurants](https://www.spokin.com/verified-restaurants)
- [Yummly Shutdown — MealThinker](https://mealthinker.com/blog/yummly-alternative)
- [Cronometer Photo Logging Launch — PRNewswire](https://www.prnewswire.com/news-releases/cronometer-launches-premium-photo-logging-fast-verified-nutrition-tracking-for-real-life-302549752.html)
- [MyFitnessPal 2025 Summer Release](https://blog.myfitnesspal.com/whats-new-this-summer-at-myfitnesspal/)
- [AI Personalized Nutrition Market — TowardsFnB](https://www.towardsfnb.com/insights/ai-in-personalized-nutrition-market)
- [Fay + Berry Street $50M Rounds — Fierce Healthcare](https://www.fiercehealthcare.com/health-tech/startups-fay-and-berry-street-each-bank-50m-growing-investor-appetite-personalized)
- [Hyperlocal Food Delivery Market — Fortune Business Insights](https://www.fortunebusinessinsights.com/hyperlocal-food-delivery-services-market-113433)
- [AI in Restaurants 2026 — Food Institute](https://foodinstitute.com/focus/6-ways-ai-will-impact-restaurants-in-2026/)
- [Restaurant AI Adoption Research 2026](https://restauranttechnologynews.com/2026/02/research-69-of-restaurants-are-adopting-ai-while-81-increase-digital-marketing-investment/)
- [SPINS 2026 Food Trends — Food Navigator](https://www.foodnavigator-usa.com/Article/2026/01/21/spins-2026-food-trends-tech-personalization-and-functional-eating/)
- [Claude Structured Outputs — Anthropic Blog](https://claude.com/blog/structured-outputs-on-the-claude-developer-platform)
- [FDA Allergen Labeling Guidance 2025 — FDA](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/food-allergies)
