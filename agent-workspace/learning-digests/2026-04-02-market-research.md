# Market Research Digest — April 2, 2026

Research agent run covering 10 search topics on user demographics, dietary restriction trends, competitive landscape, and retention benchmarks relevant to NutriScout's dish-first food discovery positioning.

---

## Finding 1: Core User Demographics — Ages 25–44 Are the Bullseye

**Data:** 60% of diet/nutrition app users are aged 25–44. Millennials and Gen Z (18–34) are the most likely to follow specialized diets, with 90% cutting discretionary spending to maintain healthy food choices. 78% of consumers say health matters when making food choices. 50% of U.S. respondents actively try to eat healthy; 30% prioritize convenience.

**Why it matters for NutriScout:** The 25–44 cohort is both health-motivated and tech-comfortable — they already use apps to track nutrition. NutriScout should optimize UX and messaging for this group first. The secondary Gen Z segment (18–24) skews toward delivery convenience; they need frictionless dietary filtering.

**Recommendation:** Profile pages, macro goal-setting, and dietary preference persistence are table-stakes features for this demographic. Onboarding should ask users to set protein/calorie goals and dietary restrictions immediately — users who set goals are 30% more likely to retain. Target marketing around "find exactly what fits your diet" messaging, not generic restaurant discovery.

**Risk tier:** GREEN — implement immediately (confirms current product direction)
**Impact:** HIGH | **Effort:** LOW (already in scope)

---

## Finding 2: GLP-1 Users — A Fast-Growing High-Value Segment

**Data (Circana, Jan 2026):** GLP-1 medication users are NOT abandoning restaurants. Visit frequency is stable. They order more main dishes, fewer sides/snacks/breads. 63% seek more vegetables; 55% seek more fruit. They skew younger, higher-income, urban, and fast-casual oriented. GLP-1 users spend MORE at restaurants than before medication. Circana projects GLP-1 users will represent 35% of U.S. food and beverage sales by 2030. 23% of U.S. households currently use GLP-1 medications.

**Why it matters for NutriScout:** This is an underserved, high-intent, high-income restaurant segment. Existing discovery apps (Yelp, Google Maps) cannot filter for "high-protein, fiber-rich, small-portion" dishes. NutriScout's dish-first search with macro filters is a natural fit.

**Recommendation:**
- Add a "GLP-1 Friendly" dietary flag or macro preset (high protein, high fiber, low carb, moderate calorie) as a named filter option
- Surface dishes with detailed macro breakdowns prominently — this cohort is making protein-first decisions
- Consider a "Smaller Portions" badge on dish listings where half-portion options exist
- Restaurant operators are actively launching GLP-1 menus (Shake Shack, Chipotle, Subway) — NutriScout should crawl and tag these proactively
- Target files: `src/lib/agents/menu-crawler/`, evaluator dietary flags, search filter UI

**Risk tier:** GREEN
**Impact:** VERY HIGH | **Effort:** MEDIUM

---

## Finding 3: Dietary Restriction Markets Are Growing Fast — Multi-Restriction Users Are the Prize

**Data:**
- Halal food market: $1.97 trillion (2025) → $2.24 trillion (2026), CAGR 13.4%
- Kosher food market: $22.8B → $29.7B by 2034, CAGR 2.89%
- 19% rise in dual-certified (kosher + halal) products — multi-restriction users are mainstream
- 4% of U.S. adults identify as vegetarian, 1% as vegan (Gallup 2023); plant-based demand growing faster than identity numbers suggest
- New 2025–2030 Dietary Guidelines emphasize high-quality protein, healthy fats, whole grains, avoiding ultra-processed foods — macro-conscious eating is now officially mainstream

**Why it matters for NutriScout:** Multi-restriction users (e.g., vegan + gluten-free, halal + nut-free) are severely underserved by general restaurant apps that can't cross-filter at the dish level. These users are high-frequency searchers with safety-critical needs.

**Recommendation:**
- The Apollo Evaluator's conservative defaults (null for uncertain, not true) are exactly right for safety-critical restrictions — do not change this behavior
- Consider surfacing compound filter badges: "Vegan + GF" or "Halal + High-Protein" as preset combos
- Partner/marketing angle: halal-certified users (massive market) have almost no dish-level discovery tool
- Target files: search filter UI, evaluator confidence thresholds, dietary flag schema

**Risk tier:** GREEN
**Impact:** HIGH | **Effort:** LOW (existing infrastructure supports this)

---

## Finding 4: Restaurant Discovery Is an AI Arms Race — DoorDash Is Moving

**Data:** DoorDash launched "Zesty," an AI-powered restaurant discovery app, tested in NYC and SF Bay Area. Eater relaunched its discovery app with 45,000 restaurants across 85 cities. Restaurant discovery is described as "more personalized, more conversational, increasingly AI-driven." The restaurant reservations wars are intensifying (CNN, March 2026). Restaurant tech M&A is regaining momentum entering 2026.

**Why it matters for NutriScout:** The window to establish a dish-first, dietary-restriction-aware discovery niche is narrowing. DoorDash's Zesty is restaurant-first and delivery-focused; NutriScout's dish-first approach with real macro data is genuinely differentiated — but needs to ship fast.

**Recommendation:**
- NutriScout's moat is in dish-level data + macro accuracy + dietary safety, NOT general restaurant browsing. Double down on what generic AI apps can't do: verified allergen flags and vision-analyzed nutrition estimates.
- Consider adding a conversational search entry point ("Find me a high-protein gluten-free lunch near me") powered by the orchestrator — this matches where discovery UX is heading
- Prioritize menu crawl coverage in target cities before competitors build dataset parity
- Target files: Search Orchestrator, frontend search UX, Menu Crawler coverage

**Risk tier:** YELLOW (competitive urgency)
**Impact:** VERY HIGH | **Effort:** HIGH

---

## Finding 5: Biohackers Want Micronutrient Precision + AI Photo Logging

**Data:** Biohacker-preferred apps (Cronometer) use USDA/NCCDB verified data rather than crowdsourced entries. 80% of calorie trackers fail due to tedious manual logging. AI photo, voice, and conversational logging are now standard expectations. Biohackers want holistic dashboards covering nutrition, sleep, supplements, and wearable data. Professional integration (virtual nutritionist booking) is trending.

**Why it matters for NutriScout:** NutriScout's Vision Analyzer (Claude Haiku, USDA matching) already addresses the accuracy gap. The key gap is making confidence scores and data source transparency visible to biohacker users who care deeply about data provenance.

**Recommendation:**
- Expose the macro confidence score and data source (Vision AI vs. USDA match vs. menu scrape) on dish detail pages — biohackers will trust NutriScout more than MyFitnessPal for restaurant macro data
- Consider a "Macro Source" badge: "USDA Verified," "Vision Estimated," "Menu Listed"
- The AGENTS.md note about `getSourceIcon()` returning JSX is already implemented — ensure this is surfaced prominently in dish detail UI
- Target files: dish detail component, Vision Analyzer response formatting, USDA client

**Risk tier:** GREEN
**Impact:** MEDIUM-HIGH | **Effort:** LOW (data already exists, just needs UI exposure)

---

## Finding 6: Gen Z + Millennial Usage Patterns — Speed, Customization, Social Proof

**Data:**
- 63% of Gen Z regularly use food delivery apps vs. 51% of Millennials
- 70% of Gen Z cite convenience as primary reason for delivery app use
- 75% of Gen Z customize their orders; they prefer highly personalized recommendations
- Gen Z food choices heavily influenced by TikTok > YouTube Shorts > Instagram Reels
- Millennials (83%) prefer ordering through dedicated restaurant apps over third-party platforms
- Nearly 4 in 10 Millennials/Gen Z use restaurant apps weekly

**Why it matters for NutriScout:** Gen Z's insistence on customization maps directly to NutriScout's multi-filter dish search. TikTok-driven food discovery means social sharing features (shareable dish cards, "I found this on NutriScout") could be a meaningful acquisition channel.

**Recommendation:**
- Build shareable dish detail cards optimized for social (Open Graph image with macro display, dietary badges)
- Empty states on search should be fast and actionable — Gen Z abandons friction instantly
- Mobile UX must be flawless — this cohort is phone-first; the `viewportFit: "cover"` + safe area inset patterns in AGENTS.md are correct but must be tested rigorously
- Target files: dish detail page, search results, OG image generation, mobile layout

**Risk tier:** GREEN
**Impact:** HIGH | **Effort:** MEDIUM

---

## Finding 7: Delivery Platform Behavior — Users Start Discovery on Third-Party Apps

**Data:**
- 51% of U.S. consumers turn to third-party platforms (DoorDash, etc.) to choose a restaurant for delivery/takeout
- DoorDash holds 56% of U.S. food delivery market; Uber Eats 23%
- Average U.S. consumer orders delivery 1.1x/week (~$1,850/year)
- 62% of food delivery app users pay for a premium subscription
- 36% of Americans don't use food ordering apps at all (ceiling for addressable market)
- 83% of Millennials prefer dedicated restaurant apps over third-party platforms for ordering

**Why it matters for NutriScout:** The discovery funnel is: NutriScout discovers dish → user orders via delivery platform or goes to restaurant. NutriScout is upstream of delivery, not competing with it. The Logistics Poller (wait times, delivery availability) makes NutriScout actionable, not just informational.

**Recommendation:**
- Deep-link from dish detail into DoorDash/Uber Eats for that dish or restaurant (affiliate/partnership opportunity)
- The delivery platform stub in Logistics Poller should be prioritized for real implementation — it closes the loop from discovery to order
- Premium subscription at ~$5–10/month has clear precedent (62% of delivery users already pay for subscriptions)
- Target files: Logistics Poller delivery platform integration, dish detail CTA, monetization strategy

**Risk tier:** YELLOW
**Impact:** HIGH | **Effort:** MEDIUM-HIGH

---

## Finding 8: Subscription Willingness to Pay — $15/month ARPU Is Achievable

**Data:**
- Global fitness apps market expected to reach $13.92B in 2026
- ARPU for nutrition apps projected at $15.29/month
- 75% of nutrition app revenue comes from premium subscriptions/in-app purchases
- 70% of top apps use freemium model
- Subscription revenue saw 120% YoY increase (recent period)
- 63% of people who pay for health apps hold paid fitness/exercise app subscriptions
- Global digital fitness spending projected to surpass $60B by 2026 (including wearables, apps, connected equipment)
- iOS users show higher willingness to pay for premium app features

**Why it matters for NutriScout:** The market has fully accepted $10–20/month for health app subscriptions. NutriScout's premium tier (saved dietary profiles, advanced macro goals, full restaurant coverage, dish history) has a clear monetization path.

**Recommendation:**
- Freemium entry (basic search, 3 dietary filters) with paid tier ($12.99/month) for: unlimited filters, macro goals sync, dish save/history, GLP-1 presets, allergy alerts
- iOS-first monetization priority (higher willingness to pay per data)
- Consider annual plan at $99/year ($8.25/month) to reduce churn
- Target files: user profile/subscription model, feature gating architecture

**Risk tier:** GREEN
**Impact:** HIGH | **Effort:** MEDIUM (requires paywall architecture)

---

## Finding 9: App Retention Benchmarks — NutriScout's Day-30 Target Should Be 12%+

**Data (2026 benchmarks):**
| Category | Day 1 | Day 7 | Day 30 |
|---|---|---|---|
| Health & Fitness | 28% | 18.13% | 8.48% |
| Food & Drink | 22.86% | 18.85% | 7.86% |
| Overall Average | 28.29% | 17.86% | 7.88% |

- 70% of users abandon apps within 2 weeks if too complex
- Push notification within first 90 days = 3x more likely to retain
- Goal-setting during onboarding = 30% higher retention
- Social features = 25% higher engagement
- Gamification (badges) = 40% engagement boost
- Reward-based fitness apps (Sweatcoin) achieve 20–31% Day 30 retention — showing what's possible with strong incentive loops
- 91% of CX leaders say AI-driven personalization improves retention

**Why it matters for NutriScout:** Industry average for Day 30 is ~8%. A dish-first app with strong dietary restriction utility should target 12–15%+ by leveraging goal-setting onboarding, push alerts for new dishes matching user restrictions near them, and saved search notifications.

**Recommendation:**
- Onboarding MUST capture dietary restrictions + macro goals (not optional skippable step)
- Push notification trigger: "New [cuisine type] [dietary flag] dish added near you" — implement via BullMQ notification job
- Saved searches / dish favorites as retention anchor
- Weekly "Your top dishes nearby" digest email
- Avoid complexity creep — 70% churn from complexity is the primary risk for a feature-rich app like NutriScout
- Target files: onboarding flow, notification worker, BullMQ job types

**Risk tier:** GREEN
**Impact:** HIGH | **Effort:** MEDIUM

---

## Finding 10: Food Allergy & Dietary Safety — The Trust Moat

**Data (from dietary guidelines + market data):**
- Nearly 90% of U.S. healthcare spending goes toward chronic diseases linked to diet
- 70%+ of American adults are overweight/obese; 1 in 3 adolescents has prediabetes
- Kosher market non-Jewish buyers growing due to quality/safety perceptions (allergy-safe halo effect)
- Dual-certified (kosher + halal) products up 19% — multi-restriction mainstream
- 60% of nutrition app users express privacy concerns about health data
- 2025–2030 USDA Dietary Guidelines reset: emphasis on real food, high protein, away from ultra-processed

**Why it matters for NutriScout:** The Apollo Evaluator's safety-first posture (nut_free, gluten_free require explicit `true` + 85%+ confidence) is a genuine trust differentiator. FARE allergy data consistently shows ~33M Americans have food allergies — and they have nowhere reliable to find restaurant dishes filtered at the dish level (not just restaurant level).

**Recommendation:**
- Make "Allergy Safe" the featured trust message in onboarding and marketing — not "find healthy food." Safety is stickier than wellness.
- Add an "Allergy Alert" badge when a dish has not been verified for specific restrictions (shows `null` flag) vs. a "Verified Safe" badge for `true` + high confidence
- Privacy: since 60% of health app users express privacy concerns, add clear in-app copy that dietary restriction data stays on-device or is anonymized
- FARE partnership or citation on the allergy verification methodology would add credibility
- Target files: Apollo Evaluator display logic, dish detail allergen UI, onboarding copy

**Risk tier:** GREEN
**Impact:** VERY HIGH | **Effort:** LOW-MEDIUM

---

## Summary Priority Matrix

| Finding | NutriScout Impact | Effort | Priority |
|---|---|---|---|
| GLP-1 segment + macro presets | VERY HIGH | MEDIUM | P1 |
| Allergy trust + Evaluator UI transparency | VERY HIGH | LOW | P1 |
| Biohacker macro source transparency | HIGH | LOW | P1 |
| Retention: goal-setting onboarding | HIGH | LOW | P1 |
| Multi-restriction compound filters | HIGH | LOW | P2 |
| Delivery platform deep-links (Logistics Poller) | HIGH | MEDIUM-HIGH | P2 |
| Gen Z social sharing / shareable dish cards | HIGH | MEDIUM | P2 |
| Subscription/freemium paywall | HIGH | MEDIUM | P3 |
| Conversational search entry point | VERY HIGH | HIGH | P3 |
| DoorDash Zesty competitive monitoring | MEDIUM | LOW | P3 |

---

## Sources
- [Health Conscious Consumer Statistics 2026](https://media.market.us/health-conscious-consumer-statistics/)
- [Diet and Nutrition Apps Statistics 2026](https://media.market.us/diet-and-nutrition-apps-statistics/)
- [GLP-1 Users Restaurant Behavior — Circana Research](https://www.globenewswire.com/news-release/2026/01/14/3218743/0/en/GLP-1-Users-Aren-t-Ditching-Restaurants-But-Their-Ordering-Habits-Are-Changing-New-Circana-Research-Finds.html)
- [GLP-1 Prediction 2026 — Food Institute](https://foodinstitute.com/focus/glp-1-prediction-for-2026-smarter-portions-will-become-prevalent/)
- [GLP-1 Reshaping Restaurant Menus 2026 — Tasting Table](https://www.tastingtable.com/2112138/glp1-menu-trend-2026/)
- [Halal Food Market Report 2026 — Research and Markets](https://www.researchandmarkets.com/reports/5744211/halal-food-market-report)
- [Kosher Food Market Analysis 2026-2034 — GlobeNewswire](https://www.globenewswire.com/news-release/2026/03/23/3260654/28124/en/Kosher-Food-Market-Analysis-Report-2026-2034-With-the-Rise-of-Veganism-Kosher-Manufacturers-are-Capitalizing-by-Offering-Plant-based-Dairy-Free-and-Vegan-Options-to-a-Diverse-Audience.html)
- [DoorDash Zesty AI Discovery App — Restaurant Dive](https://www.restaurantdive.com/news/doordash-new-york-san-francisco-market-test-zesty-discovery-app/808118/)
- [5 Restaurant Tech Predictions 2026](https://www.restaurantbusinessonline.com/technology/5-restaurant-tech-predictions-2026)
- [App Retention Guide 2026 — GetStream](https://getstream.io/blog/app-retention-guide/)
- [Fitness App Revenue Statistics 2026 — Business of Apps](https://www.businessofapps.com/data/fitness-app-market/)
- [Gen Z Food App Usage — Restaurant Dive / Toast](https://pos.toasttab.com/blog/on-the-line/gen-z-food-trends)
- [Food Delivery Statistics 2026 — Oyster Link](https://oysterlink.com/spotlight/food-delivery-market-share-statistics/)
- [Millennials vs Gen Z Food Trends 2026 — Dana Hospitality](https://dana.dexterra.com/blog/millennials-vs-gen-z-food-trends-whats-cooking-in-2026/)
- [Biohacking Nutrition Apps 2026 — Go Health](https://www.go-health.net/2026/01/biohacking-diet-nutrition-fundamentals-macros-sensitivities.html)
- [2025-2030 Dietary Guidelines — USDA](https://www.fns.usda.gov/newsroom/usda-0003.26)
- [Food Tracking Apps Market — DataInsightsMarket](https://www.datainsightsmarket.com/reports/food-tracking-apps-528487)
