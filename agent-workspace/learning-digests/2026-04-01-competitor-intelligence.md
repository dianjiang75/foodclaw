# Competitor Intelligence: Q1 2026 Landscape
**Date**: 2026-04-01
**Focus**: Real-time competitive moves — dish discovery, dietary filtering, AI nutrition features
**Research method**: 6 targeted web searches + 4 source fetches

---

## EXECUTIVE SUMMARY

Three urgent signals for NutriScout:
1. **Cravr is a direct clone of our concept** — dish-first discovery, AI ranking, delivery platform indexing, launched Dec 2025. Currently tiny (6 ratings) and SF-only. We have a short window before they grow.
2. **DoorDash launched Zesty** (Dec 2025 public beta) — AI conversational restaurant discovery. Big-co entry into our discovery layer with massive distribution advantage.
3. **MyFitnessPal's Winter 2026 release** (Feb 24, 2026) doubled down on meal-logging, not discovery — their AI photo scan helps users log meals they already ate, not find new ones. This is a gap NutriScout owns.

---

## COMPETITOR UPDATES

### 1. MyFitnessPal — Winter 2026 Release
**Date**: February 24, 2026
**Source**: [GlobeNewswire press release](https://www.globenewswire.com/news-release/2026/02/24/3243668/0/en/MyFitnessPal-Debuts-Its-2026-Winter-Release.html) + [official blog](https://blog.myfitnesspal.com/winter-release-2026-nutrition-tracking-updates/)

**What launched**:
- **Photo Upload / Meal Scan (iOS only, Premium+)**: Take a photo of your plate, log it later. AI estimates macros from their 14M-item database. This is reactive logging, NOT proactive discovery.
- **Enhanced Meal Planner (Premium+)**: New Recipes tab, save-to-favorites. Closes the "meal planning" loop within MFP.
- **Blue Check Collection (Premium+)**: RD-reviewed recipes curated to counter viral nutrition trends.
- **GLP-1 medication tracker**: Log Ozempic/Wegovy dosage, timing, injection site alongside food logs. New user segment being captured.
- **Instacart integration**: $10 off first 3 grocery orders for new Instacart users (through Aug 16, 2026) — closes a grocery-to-plate loop.
- **Redesigned Today tab**: Streaks, cleaner macro display, Healthy Habits section.

**Pricing** (confirmed unchanged):
- Free (limited)
- Premium: $79.99/yr
- Premium+: $99.99/yr

**CPO quote**: "Features like Photo Upload fit into real life without adding pressure, while our registered dietitians provide credible nutrition guidance." — Tim Holley, CPO

**NutriScout implication**:
- MFP is firmly a **post-meal logger**, not a **pre-meal finder**. Zero dish discovery, zero dietary filtering for restaurant search.
- The GLP-1 tracker is a new high-intent user cohort (appetite-suppressed, protein-focused, small portions) — NutriScout should consider making GLP-1 users an explicit dietary profile in our filter set.
- Photo logging is MFP's answer to restaurant meals — but it only works *after* you've already ordered. We solve the *before* problem.
- **Risk tier**: LOW (not competing in discovery). **Opportunity**: GLP-1 filter addition = GREEN tier improvement.

---

### 2. MacroFactor — AI Food Logging
**Source**: [macrofactor.com/ai-food-logging](https://macrofactor.com/ai-food-logging/) + [help docs](https://help.macrofactorapp.com/en/articles/216-log-foods-with-describe)

**What launched**: MacroFactor added two AI-assisted logging paths:
- **AI Photo Logging**: Snap a photo of a meal, AI identifies foods and estimates macros. Positioned explicitly for restaurant meals ("the occasional restaurant meal").
- **Describe feature**: Type or speak a meal description ("I had a chicken caesar salad and a Diet Coke at a restaurant"), AI parses and logs it without searching individual items.

**Pricing**: [NutriScan analysis](https://nutriscan.app/blog/posts/macrofactor-cost-2026-free-version-29f5edc98b) confirms no free tier for AI features; MacroFactor is a paid-only app (~$11.99/mo or discounted annually).

**NutriScout implication**:
- MacroFactor's restaurant solution is still *retrospective* — you log what you ate. No dish finder, no dietary flag awareness, no pre-decision support.
- Their "Describe" feature does reduce friction for restaurant logging. If we add a "log what you ate" micro-feature post-discovery, we could keep users in-app for their full meal journey.
- **Risk tier**: LOW. **Opportunity**: Consider a post-meal confirmation/logging flow to capture this use case without building a full tracker.

---

### 3. Cravr — DIRECT COMPETITOR (CRITICAL)
**Source**: [App Store listing](https://apps.apple.com/us/app/cravr-smarter-food-search/id6754335758)

**What it is**: Cravr describes itself as a **dish-first food discovery app** — almost word-for-word our positioning. It indexes millions of dishes from Uber Eats, DoorDash, Yelp, and Google, then ranks with AI-powered embeddings and taste filters. Swipe-based UI with map browsing.

**Current state**:
- Version 1.1.1 released December 9, 2025
- 4.3/5 stars — but only **6 total ratings** (SF market only, very early stage)
- Free, no in-app purchases
- iOS only (33.9 MB)
- Developer: Mayank Shekhar Singamreddy (solo developer)

**Feature parity vs. NutriScout**:
| Feature | Cravr | NutriScout |
|---|---|---|
| Dish-first search | Yes | Yes |
| AI ranking/embeddings | Yes | Yes |
| Delivery platform indexing | Yes (UE, DD, Yelp, Google) | Stub/partial |
| Taste filters | Yes | Dietary flags |
| Macro estimation | No | Yes (Claude Vision) |
| Dietary restriction safety | No | Yes (Apollo Evaluator) |
| Swipe UI | Yes | No |
| Map browse | Yes | No |
| Nutritional data | No | Yes |

**Gap assessment**: Cravr wins on social UX (swipe, map). NutriScout wins on nutritional intelligence and dietary safety. They are going after food-curious users; we go after health-conscious users. These are different but overlapping markets.

**Risk tier**: HIGH. Solo dev, early stage — but the concept validation and App Store presence mean larger players will notice this niche.

**Action items**:
- Consider adding swipe/map browse as a secondary discovery mode (YELLOW tier)
- Our dietary safety evaluator is a hard moat Cravr doesn't have — make it more visible in the UI
- Watch for their next funding announcement

---

### 4. DoorDash Zesty — Big-Co Discovery Entry
**Source**: [PYMNTS.com, December 17, 2025](https://www.pymnts.com/aggregators/2025/doordash-debuts-zesty-an-ai-social-app-for-restaurant-discovery/)

**What it is**: A standalone app from DoorDash focused purely on restaurant discovery — not ordering. Uses conversational AI ("low-key dinner in Williamsburg good for introverts") and social signals (follow other diners, share experiences) to recommend restaurants.

**Key details**:
- **Launch**: Public beta, December 17, 2025
- **Markets**: New York and San Francisco Bay Area
- **Data sources**: Synthesizes DoorDash, Google Maps, TikTok, and "other sources"
- **No bookings or reservations** — discovery only
- **No dish-level search** — restaurant-first, not dish-first
- **No dietary restriction filtering mentioned**
- Co-founder Andy Fang: app helps users "connect with the best of their communities"

**NutriScout implication**:
- Zesty validates the market: even DoorDash recognizes that discovery is broken and needs its own surface.
- Zesty is **restaurant-first** (exactly what NutriScout is not). Their conversational AI answers "where should I eat?" We answer "I want X dish that fits Y diet."
- Zesty's social layer (follow diners, share photos) is a feature NutriScout lacks entirely. Worth monitoring — if Zesty adds dish-level search or dietary filters, they become a serious threat.
- **Risk tier**: MEDIUM now, HIGH if they add dish-level search.
- **Opportunity**: NutriScout should articulate "dish-first vs restaurant-first" as a clear differentiation message.

---

### 5. Emerging AI Nutrition Apps (Product Hunt / App Stores)

**Source**: [10 Best Nutrition Tracking Apps 2026](https://www.nutrola.app/en/blog/best-nutrition-tracking-apps-2026-ai-changing-everything)

Notable new entrants:
- **Nutrola**: "Best nutrition tracking app in 2026" per independent reviews. 100% nutritionist-verified database, AI photo/voice/text logging. No restaurant discovery angle.
- **Welling.ai**: Analyzes food logs and auto-generates personalized weekly grocery lists. Interesting adjacent play — grocery optimization downstream of nutrition tracking.
- **NutriScan**: Positions as "world's most advanced AI food tracker" with global cuisine recognition. No restaurant discovery.
- **Emma: AI Food Scanner** (Product Hunt): Sugar-free food scanner, AI nutrition intelligence for global foods.
- **Simply: AI Nutrition App** (Product Hunt): Minimal AI-driven nutrition companion.

**Pattern**: All these apps are still **retrospective loggers**. None do proactive dish discovery. The entire category is "help me log what I ate," not "help me find what to eat." NutriScout's lane is uncrowded at the AI-native level.

---

### 6. Dietary Restriction Apps — Incumbents Still Dominant

**Source**: [EqualEats blog](https://equaleats.com/blogs/news/finding-your-perfect-meal-the-best-websites-and-apps-for-dietary-restriction-friendly-restaurants)

Established players with no major 2026 updates detected:
- **Picknic** (picknic.app): Allergy/GF/vegan restaurant finder, crowdsourced data.
- **Spokin**: Food allergy dining directory, personalized by restriction profile.
- **Find Me Gluten Free**: GF-specific directory, bakeries and restaurants.
- **HappyCow**: Vegan/vegetarian restaurant locator, global coverage.

**Notable**: Missouri Restaurant Association launched a **multilingual menu app** ahead of the 2026 FIFA World Cup (February 18, 2026) — accessibility-focused, translates menus. Not a direct competitor but shows restaurant operators investing in digital menu infrastructure.

**NutriScout implication**: These incumbents do restriction-aware restaurant discovery but lack: (1) dish-level search, (2) AI macro estimation, (3) real-time logistics. They remain un-AI-fied. Our AI Evaluator approach is architecturally ahead.

---

## USER SENTIMENT TRENDS (Q1 2026)

Based on aggregated signals across search results:

1. **Frustration with paywalled basics**: MFP users increasingly vocal about features being locked behind Premium+. Sentiment: "I pay $100/yr and the app got worse." Opportunity for NutriScout to offer a generous free tier as a competitive wedge.

2. **Demand for AI logging with less friction**: MacroFactor's "Describe" feature and MFP's Photo Upload both got positive reception — users want to log in 10 seconds, not 2 minutes. Implication: NutriScout's dish-card design should surface macro estimates immediately, not behind a detail page.

3. **30M US consumers have abandoned traditional search** for AI-driven, outcome-oriented interactions — this stat appeared in multiple sources. Validates our natural language search approach.

4. **GLP-1 cohort is a real and growing segment**: MFP's explicit GLP-1 tracker signals this is a user segment worth targeting. GLP-1 users have specific nutritional needs (high protein, small portions, nausea avoidance) that NutriScout's macro filtering could serve perfectly.

5. **Social proof and community signals matter**: Zesty's social layer, HappyCow's community reviews, and Cravr's taste-filter sharing all point to a shift toward "what are people like me eating" signals vs. raw star ratings.

---

## BUSINESS MODEL OBSERVATIONS

| App | Model | Price |
|---|---|---|
| MyFitnessPal | Freemium | Free / $79.99 / $99.99 yr |
| MacroFactor | Paid-only | ~$11.99/mo |
| Cravr | Free | $0 (no IAP) |
| Zesty (DoorDash) | Free (beta) | Unknown — likely monetizes via DoorDash referrals |
| Picknic / Spokin | Freemium | Free / small premium |
| Nutrola / NutriScan | Freemium | Free / ~$5-10/mo |

**Trend**: New entrants are going free-to-grow, established players are raising paywalls. NutriScout should stay generous at the free tier to acquire users that MFP is alienating.

---

## CODE RECOMMENDATIONS (Cross-referenced with actual source files)

### CRITICAL: Surface Apollo Evaluator results on dish cards
**Files read**: `src/lib/evaluator/index.ts`, `src/app/page.tsx` (lines 96–117), `src/components/filter-drawer.tsx`

The Apollo Evaluator (`src/lib/evaluator/index.ts`) runs and produces a `warnings: string[]` field on `DishResult` objects. However, in `src/app/page.tsx` the `fetchDishes` mapping (lines 96–117) does not pass `warnings` through to `DishCardData`. They are silently dropped. Users who set dietary filters receive NO visual confirmation that dishes have been evaluated safe — the single most critical differentiator vs Cravr.

**What to change**:
1. Read `src/components/dish-card.tsx` to understand current card rendering
2. Add `warnings: string[]` to `DishCardData` interface
3. Thread `warnings: d.warnings ?? []` through the mapping in `src/app/page.tsx` line ~114
4. Render a green shield icon on dish cards with zero warnings + dietary filters active
5. Render a yellow caution badge (with tooltip showing warnings) when `warnings.length > 0`

This is a visual moat that Cravr literally cannot match — they have no evaluator infrastructure.

### MEDIUM: Add GLP-1 as a nutritional profile in filters
**Files read**: `src/types/index.ts`, `src/lib/orchestrator/types.ts` (line 9), `src/components/filter-drawer.tsx` (line 19)

Current `NutritionalGoals.priority` in `src/types/index.ts` supports: `"max_protein" | "min_calories" | "min_fat" | "balanced"`. The `UserSearchQuery.nutritional_goal` field in `src/lib/orchestrator/types.ts` mirrors this. GLP-1 users need a composite filter: high protein + low calorie density + small portions.

**What to change**:
1. Add `"glp1_friendly"` to the `nutritional_goal` union type in `src/lib/orchestrator/types.ts`
2. In the search orchestrator, map `"glp1_friendly"` to: `protein_min_g ≥ 25, calories_max ≤ 500, prefer_small_portions = true`
3. Add "GLP-1 Friendly" as a goal preset in the filter drawer (`src/components/filter-drawer.tsx`) — not a dietary restriction but a nutritional goal profile
4. **Do not modify the `DietaryFlags` interface** (`src/types/index.ts`) — GLP-1 is a nutritional goal, not a dietary restriction

### LOW: Clarify dietary filter section wording
**File read**: `src/components/filter-drawer.tsx` (line 134)

The section header "Dietary Preferences" (line 134) is generic. After surfacing the Apollo Evaluator badges, rename this section to "Dietary Safety Filters" with a sub-caption like "Dishes are AI-verified for these needs." This copies the confidence MFP gets from their "Blue Check" RD verification, using our algorithmic verification as the equivalent trust signal.

---

## PRIORITY ACTIONS FOR NUTRISCOUT

### Immediate (GREEN tier — implement this week)
1. **Add GLP-1 as a dietary profile option** — captures a fast-growing, underserved user segment that MFP is now explicitly targeting with their tracker feature
2. **Sharpen "dish-first" messaging in onboarding** — differentiate from Zesty (restaurant-first) and MFP (post-meal logger) with explicit language
3. **Surface dietary evaluator confidence visually** — our Apollo Evaluator is a safety moat Cravr lacks; make the "verified safe for your diet" badge prominent on dish cards

### Short-term (YELLOW tier — next sprint)
4. **Map browse mode** — Cravr has this, users expect it; adds a spatial discovery layer
5. **Post-meal confirmation/log flow** — capture the "I ordered this, how did I do?" moment to compete with MacroFactor's retrospective logging
6. **Monitor Cravr closely** — check App Store reviews monthly; if they add dietary flags or macro data, escalate to RED tier

### Watch list (not urgent)
7. Zesty dietary restriction filtering — if DoorDash adds it, our response time must be fast
8. Welling.ai grocery integration — interesting downstream partnership opportunity

---

## SOURCES

- [MyFitnessPal Winter 2026 Release — GlobeNewswire](https://www.globenewswire.com/news-release/2026/02/24/3243668/0/en/MyFitnessPal-Debuts-Its-2026-Winter-Release.html) (Feb 24, 2026)
- [MFP Winter Release — Official Blog](https://blog.myfitnesspal.com/winter-release-2026-nutrition-tracking-updates/)
- [MFP Today Tab Update](https://blog.myfitnesspal.com/myfitnesspal-today-screen-progress-tab-update/)
- [MacroFactor AI Food Logging](https://macrofactor.com/ai-food-logging/)
- [MacroFactor Describe Feature](https://help.macrofactorapp.com/en/articles/216-log-foods-with-describe)
- [MacroFactor Cost 2026 — NutriScan Analysis](https://nutriscan.app/blog/posts/macrofactor-cost-2026-free-version-29f5edc98b)
- [Cravr — App Store Listing](https://apps.apple.com/us/app/cravr-smarter-food-search/id6754335758)
- [DoorDash Zesty — PYMNTS](https://www.pymnts.com/aggregators/2025/doordash-debuts-zesty-an-ai-social-app-for-restaurant-discovery/) (Dec 17, 2025)
- [10 Best Nutrition Tracking Apps 2026 — Nutrola](https://www.nutrola.app/en/blog/best-nutrition-tracking-apps-2026-ai-changing-everything)
- [Best Free Macro Tracking Apps 2026 — NutrifyTracker](https://nutrifytracker.com/blog/best-macro-tracking-apps)
- [Best Nutrition Apps 2026 — Valtorian](https://www.valtorian.com/blog/best-nutrition-apps-2026)
- [Dietary Restriction Restaurant Apps — EqualEats](https://equaleats.com/blogs/news/finding-your-perfect-meal-the-best-websites-and-apps-for-dietary-restriction-friendly-restaurants)
- [Picknic — dietary restriction restaurant app](https://picknic.app/)
- [FoodTech Startups 2026 — StartUs Insights](https://www.startus-insights.com/innovators-guide/food-tech-startups-and-companies/)
- [Missouri Restaurant Multilingual Menu App — KCTV5](https://www.kctv5.com/2026/02/18/missouri-restaurant-association-launches-multilingual-menu-app-ahead-of-world-cup/) (Feb 18, 2026)
- [Emma: AI Food Scanner — Product Hunt](https://www.producthunt.com/products/sugar-free-food-scanner)
- [Simply: AI Nutrition App — Product Hunt](https://www.producthunt.com/products/simply-4)
- [NutriScan AI Food Tracker](https://nutriscan.app/apps/ai-food-tracker)
- [Welling.ai — AI Grocery Lists](https://www.welling.ai/articles/best-diet-tracking-app-ai-grocery-lists-2026)
