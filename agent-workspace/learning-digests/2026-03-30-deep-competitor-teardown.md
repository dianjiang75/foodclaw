# Deep Competitor Teardown
**Date**: 2026-03-30
**Focus**: Every competitor in the dish discovery / nutrition tracking / dietary restriction space

---

## 1. MyFitnessPal

**Core proposition**: The world's largest food database and calorie tracker (220M registered users, 30M MAU, $310M revenue).

**Pricing**: Free (limited) / Premium $79.99/yr / Premium+ $99.99/yr

**Top 3 strengths**:
1. Massive food database (14M+ items) — hard to replicate
2. Brand recognition and network effects — everyone knows it
3. 97% food identification accuracy in University of Sydney study

**Top 3 user complaints**:
1. **Pay-to-play creep** — barcode scanner, AI meal scanner, and macro details all moved behind Premium. Users say "features reduced, price didn't drop." ([PissedConsumer](https://myfitnesspal.pissedconsumer.com/review.html), [BBB](https://www.bbb.org/us/ca/san-francisco/profile/online-shopping/myfitnesspal-1116-539525/complaints))
2. **App is painfully slow** — 3-5 second delays on screen presses, new dashboard requires multiple steps to add anything. Foods showing 0 calories. ([MFP Community](https://community.myfitnesspal.com/en/discussion/10950284/myfitnesspal-s-new-update-love-or-hate))
3. **Billing/cancellation nightmares** — charged after cancellation, password resets broken, no customer service phone number. Data privacy lawsuit in 2025 for tracking users without consent. ([Hoot Fitness](https://www.hootfitness.com/blog/why-users-are-switching-from-myfitnesspal-and-what-they-re-choosing-instead))

**Gaps we fill**: MFP tracks what you already ate. It does NOT help you decide what to order. Zero dish discovery, zero dietary restriction filtering for restaurants, zero real-time availability.

---

## 2. Cronometer

**Core proposition**: Most accurate nutrition tracker with 84 micronutrients tracked, verified USDA data (2M+ registered users).

**Pricing**: Free (with ads) / Gold $49.99-$59.99/yr

**Top 3 strengths**:
1. Data accuracy — all entries verified against USDA/NCCDB, no crowdsourced junk
2. 84 micronutrients tracked (vs MFP's basic macros) — loved by biohackers
3. Google Play "Best Everyday Essential" winner

**Top 3 user complaints**:
1. **Intrusive ads** — full-screen video ads "hijack the app for up to half a minute," even mid-meal-logging. Users feel "bullied into Gold subscription." ([Hoot Fitness](https://www.hootfitness.com/blog/cronometer-alternatives-find-the-best-fit-for-your-tracking-style))
2. **No meal separation on free tier** — can't organize by meal timing without Gold. Logging recipes is clunky. ([VegFAQs](https://vegfaqs.com/cronometer-vs-myfitnesspal/))
3. **Smaller database** — barcode scanning fails more often than MFP, requiring manual entry. No community/social features. ([Calorie Tracker Buddy](https://calorietrackerbuddy.com/blog/myfitnesspal-vs-cronometer-which-is-more-accurate/))

**Gaps we fill**: Same as MFP — zero dish discovery, zero restaurant integration. Cronometer users are our ideal converts because they care deeply about data accuracy.

---

## 3. SnapCalorie

**Core proposition**: Most accurate AI photo-based calorie estimation using LIDAR depth sensors (16% mean error rate).

**Pricing**: Freemium model with premium subscription

**Top 3 strengths**:
1. LIDAR volumetric measurement — physically measures food volume, not just visual estimation
2. 16% mean error rate — best-in-class for photo-based tracking
3. Human review layer for quality assurance

**Top 3 user complaints**:
1. **Ingredient identification not always accurate** — some labels misleading ([WellnessPulse](https://wellnesspulse.com/nutrition/snapcalorie-ai-image-tracker-review/))
2. **Android bugs** — voice description breaking, save buttons not working on Pixel (Feb 2026) ([Google Play](https://play.google.com/store/apps/details?id=com.snapcalorie.alpha002&hl=en_CA))
3. **Only works on food you already have** — no pre-purchase estimation from menu photos

**Gaps we fill**: SnapCalorie analyzes food on your plate. We estimate macros BEFORE you order from menu/listing photos. Completely different use case.

---

## 4. MacroFactor

**Core proposition**: Smartest adaptive macro tracker for serious lifters, with dynamic TDEE adjustment (by Greg Nuckols).

**Pricing**: $5.99/month or $71.99/year

**Top 3 strengths**:
1. Adaptive algorithm — automatically adjusts calorie/macro targets based on actual weight trends
2. Founded by world-record powerlifter with evidence-based approach
3. Google Play "Best Everyday Essential" winner, recommended in every neutral fitness community

**Top 3 user complaints**:
1. **No workout tracking** — nutrition only, need separate app for training ([Dr Muscle](https://dr-muscle.com/macrofactor-app-review/))
2. **No social/community features** — isolated experience, users miss group accountability ([Outlift](https://outlift.com/macrofactor-review/))
3. **No restaurant/eating-out support** — great for meal prep, useless when dining out

**Gaps we fill**: MacroFactor users are meticulous about macros but have zero tools for eating out. We solve their #1 pain point: "I'm at a restaurant, what can I eat that fits my macros?"

---

## 5. Cravr

**Core proposition**: Dish-first food search across Uber Eats, DoorDash, Yelp, and Google with AI-powered rankings.

**Pricing**: Free (appears to be pre-revenue / early stage)

**Top 3 strengths**:
1. Actually dish-first — indexes millions of individual dishes, not restaurants
2. Cross-platform — searches across multiple delivery apps simultaneously
3. AI embeddings for taste-based matching

**Top 3 user complaints**:
1. Limited market coverage (appears focused on San Francisco)
2. No dietary restriction filtering — critical gap
3. No nutritional data or macro information whatsoever

**Gaps we fill**: Cravr has the right idea (dish-first) but lacks everything that makes NutriScout valuable: dietary filters, macro estimation, nutritional goals, real-time wait times. We're Cravr + Cronometer + Fig in one app. ([App Store](https://apps.apple.com/us/app/cravr-smarter-food-search/id6754335758))

---

## 6. Noom

**Core proposition**: Psychology-based weight loss coaching with color-coded food categorization ($209/yr).

**Pricing**: ~$70/month or ~$209/year

**Top 3 strengths**:
1. Behavioral psychology approach — not just counting, but changing habits
2. Color-coded food system (green/yellow/red) — instantly understandable
3. Strong onboarding and personalization

**Top 3 user complaints**:
1. **Deceptive billing** — $62M class-action settlement for auto-renewal practices. Former engineer testified cancellation was "intentionally designed to be difficult." ([SUBTA](https://subta.com/nooms-alleged-lack-of-business-transparency-could-cost-the-weight-loss-app-62-million/))
2. **Extremely expensive** — $209/yr is 2-4x competitors with no clear value justification
3. **One-size-fits-all coaching** — generic advice that doesn't account for dietary restrictions

**Gaps we fill**: Noom doesn't help you find food, doesn't handle dietary restrictions, and is coaching-focused not discovery-focused. Different market but teaches us what NOT to do (dark patterns, deceptive billing).

---

## 7. Fig (Food Is Good)

**Core proposition**: Barcode scanner for 2,800+ dietary restrictions — "scan and know if it's safe for you."

**Pricing**: Free with premium features

**Top 3 strengths**:
1. Supports 2,800+ dietary needs — the most comprehensive restriction database
2. "Multiple Figs" — manage different family members' restrictions simultaneously
3. Dietitian-verified ingredient ratings (team of 11+ dietitians)

**Top 3 user complaints**:
1. **Cross-contamination data is unreliable** — SnackSafely found "hundreds if not thousands" of products with incorrect shared-line/facility info. For severe allergies, this is dangerous. ([SnackSafely](https://snacksafely.com/2023/09/advisory-dont-use-the-fig-scanner-app-if-the-potential-for-allergen-cross-contact-concerns-you/))
2. **Grocery-only** — scans packaged products, NOT restaurant dishes
3. **No nutritional/macro data** — tells you if something is safe, not if it fits your goals

**Gaps we fill**: Fig only works for grocery products. NutriScout works for restaurant dishes. We also add nutritional data on top of dietary safety — the combination no one else offers.

---

## 8. Find Me Gluten Free

**Core proposition**: Crowdsourced directory of 70,000+ gluten-free restaurants with community reviews.

**Pricing**: Free / Premium $25/year

**Top 3 strengths**:
1. Largest GF restaurant database (70K+ locations)
2. Community-driven reviews from actual celiac users
3. "Most Celiac Friendly" filter for dedicated GF kitchens

**Top 3 user complaints**:
1. **Single-restriction only** — gluten-free but nothing for other restrictions. Useless for someone who is GF + dairy-free + halal. ([Celiac.com](https://www.celiac.com/forums/topic/159513-apple-apps-gluten-free-scanner-find-me-gluten-free-for-restaurants/))
2. **Celiac-friendly filter paywalled** — $25/yr for the most important feature, users feel "exploited." ([WheatByTheWayside](https://wheatbythewayside.com/find-me-gluten-free-premium/))
3. **Crowdsourced = unreliable** — data quality varies, old reviews, search UX is clunky

**Gaps we fill**: We support ALL restrictions simultaneously, add nutritional data, and use AI verification instead of relying solely on crowdsourcing.

---

## 9. Zabihah / HalalTrip / Muslim Directory

**Core proposition**: Halal restaurant finders for Muslim users.

**Pricing**: Free (ad-supported)

**Top 3 strengths**:
1. Zabihah has the largest halal restaurant database globally
2. Community-verified halal status
3. HalalTrip combines halal food + mosque finder + prayer times

**Top 3 user complaints**:
1. **Frequent crashes** — "quite a few errors or crashes when using the app for just 10 minutes" ([HalalZilla](https://www.halalzilla.com/useful-halal-travel-apps/21207))
2. **Outdated data** — restaurant info, halal certification status, and contact details often stale ([Halalification](https://halalification.com/knowledge-base/food-beverages/emergencies-necessity-darurah-scholar-disagreements/handling-doubtful-foods-in-non-muslim-settings/can-i-rely-on-apps-to-find-halal-restaurants-while-abroad/))
3. **No personal lists, no nutritional data, no dietary combinations** — can't combine halal + gluten-free + high-protein

**Gaps we fill**: Halal is just one of many filters in NutriScout. Users can combine halal + any other restriction + nutritional goals. Plus we add macro data, wait times, and delivery availability.

---

## 10. Delivery Platform APIs (DoorDash / Uber Eats)

**Integration feasibility**:
- **Uber Eats**: Marketplace API with GET/PUT endpoints for menus. Menu integration guides available at [developer.uber.com](https://developer.uber.com/docs/eats/introduction).
- **DoorDash**: Developer API with Get Menu endpoints for active integrations. Docs at [developer.doordash.com](https://developer.doordash.com/en-US/).
- **KitchenHub**: Unified API that connects to both Uber Eats, DoorDash, and Grubhub via single integration. Syncs menus and pricing. ([KitchenHub](https://www.trykitchenhub.com/developer))

**Key limitation**: These APIs are designed for restaurants managing their own listings, not for third-party aggregation. We likely need to scrape or use the unified KitchenHub API for menu data, and use Google Places API for the restaurant layer.

---

## Summary: Our Competitive Moat

No single competitor combines ALL of these:

| Capability | MFP | Cronometer | SnapCalorie | MacroFactor | Cravr | Fig | FMGF | Zabihah | **Us** |
|-----------|-----|-----------|-------------|-------------|-------|-----|------|---------|--------|
| Dish-first search | - | - | - | - | YES | - | - | - | **YES** |
| Multi-restriction filter | - | - | - | - | - | YES* | - | - | **YES** |
| Macro estimation | YES | YES | YES | YES | - | - | - | - | **YES** |
| AI photo analysis | YES | - | YES | - | - | - | - | - | **YES** |
| Restaurant dishes | - | - | - | - | YES | - | YES | YES | **YES** |
| Real-time availability | - | - | - | - | - | - | - | - | **YES** |
| Halal/kosher support | - | - | - | - | - | YES* | - | YES | **YES** |

*Fig = grocery products only, not restaurant dishes

**We are the ONLY app attempting all seven capabilities simultaneously.**
