# Learning Digest: Initial Research Baseline
**Date**: 2026-03-30
**Focus**: Full baseline — market, competitors, UI/UX, target audience, agent learning sources, branding

## Market Overview

### Diet & Nutrition App Market
- **$6.94B in 2026**, growing at 16.64% CAGR to $28.36B by 2035
- Calorie counter app market: **$4.14B in 2026**, 9.27% CAGR
- Health app revenue: **$3.5B in 2025** (23.5% YoY increase)
- **80% of revenue comes from subscriptions**
- Core users: **25-44 age group** (60% of user base)
- Average engagement: **12 minutes/day**
- Sources: [Market.us](https://media.market.us/diet-and-nutrition-apps-statistics/), [Towards Healthcare](https://www.towardshealthcare.com/insights/diet-and-nutrition-apps-market-sizing)

### Underserved Markets
- **US halal food market**: $733.6B (2025), growing 8.94% CAGR — very few apps serve this
- **Global kosher food market**: $44.4B — Kosher GPS has only 60K MAU
- **32 million Americans** have food allergies (1 in 10 adults)
- Food allergy prevalence in children **up 50% between 2007-2021**
- Sources: [FARE](https://www.foodallergy.org/resources/facts-and-statistics), [Technavio](https://www.technavio.com/report/halal-food-market-industry-in-us-analysis)

---

## Competitor Landscape

### Direct Competitors (Dish Discovery)
| App | What It Does | Gap We Fill |
|-----|-------------|-------------|
| **Cravr** | AI dish-first search across delivery apps | No dietary filters, no macro data |
| **Picknic** | Restaurant discovery by dietary restriction | Restaurant-first, not dish-first; no macros |
| **Find Me Gluten Free** | 70K+ restaurants for GF | Single restriction only, no nutrition |
| **Fig** | Food scanner for 2,800+ dietary needs | Product scanning only, not restaurant dishes |
| **Word of Mouth Foodie** | Dietary filters for restaurants | Small, restaurant-level not dish-level |

### Indirect Competitors (Nutrition Tracking)
| App | Users | Revenue | Annual Price |
|-----|-------|---------|-------------|
| **MyFitnessPal** | 220M registered, 30M MAU | $310M | $80-$100/yr |
| **Noom** | Large | Significant | $209/yr |
| **Cronometer** | 2M+ registered | N/A | $50/yr |
| **Lose It!** | 40M+ downloads, 1.5M WAU | N/A | $40/yr |
| **YAZIO** | Large | N/A | $48/yr |
| **MacroFactor** | Niche fitness | N/A | $72-$144/yr |

### AI Photo Calorie Scanners
| App | Accuracy | Notes |
|-----|----------|-------|
| **MyFitnessPal** | 97% food ID | Now paywalled behind Premium |
| **SnapCalorie** | ~16% error rate | Uses LIDAR/depth sensing |
| **Nutrify** | Good | Free 3 months then paid |
| **Cal AI** | Moderate | Growing user base |

Sources: [Business of Apps](https://www.businessofapps.com/data/myfitnesspal-statistics/), [NutriScan](https://nutriscan.app/blog/posts/best-free-ai-calorie-tracking-apps-2025-bd41261e7d)

---

## Key Pain Points We Solve

1. **"I know WHAT I want but not WHERE with my restrictions"** — No app lets you query "high-protein chicken bowl, gluten-free, under 600 cal, available for delivery near me"
2. **"I track macros but fly blind eating out"** — MFP tracks what you already ate, doesn't help you decide what to order
3. **"Dietary restriction apps are siloed"** — GF-only, halal-only, kosher-only. Someone who is both gluten-free AND halal has zero apps
4. **"AI calorie estimation only works on food I already have"** — Pre-purchase macro estimation from menu photos is an open gap
5. **"No real-time availability layer on nutrition apps"** — Wait times and delivery are siloed in DoorDash/UberEats

---

## Target Audience Segments

### Segment A: Fitness Macro Trackers (Largest Revenue)
- Age 25-44, $60K-$150K income, iOS-dominant
- Already pay for MFP Premium ($80/yr) or MacroFactor
- Pain: finding restaurant/takeout food that hits their macros

### Segment B: Medically-Restricted Dieters (Highest Willingness to Pay)
- 32M Americans with food allergies, 3.3M celiac, ~20M gluten-sensitive
- Safety-driven spending — will pay for reliability
- Parents of allergic children are a fast-growing sub-segment

### Segment C: Religious Dietary Observers (Underserved, Loyal)
- Halal + kosher markets combined >$778B
- Extremely brand-loyal once they trust a platform
- Current apps (Kosher GPS, Zabihah) are single-purpose and basic

### Segment D: Health-Conscious Urban Professionals
- Age 25-39, $75K+, urban, order delivery 3-5x/week
- Want to eat healthy but lack time to cook
- Frustrated by guessing nutritional content of restaurant meals

---

## UI/UX Design Direction

### Style: Warm Minimalism
- Clean but not cold — organic warmth, genuine personality
- "Anti-AI crafting" is the biggest 2026 theme: hand-drawn shapes, organic curves, subtle imperfections
- High-quality contextual food photography as hero content (not studio shots)

### Color Palette
```
Background:    #FAF8F5 (warm off-white / Cloud Dancer)
Surface:       #FFFFFF
Primary:       #2D6A4F (deep wellness green)
Secondary:     #D4A373 (warm ochre/terracotta)
Accent:        #E9C46A (butter yellow)
Text Primary:  #3D2C2E (deep warm brown, not pure black)
Text Secondary:#8B7E74 (warm gray)
Success:       #52B788 (green)
Warning:       #F4A261 (warm amber)
Error:         #E76F51 (terracotta red)
```

### Typography
- Headlines: **DM Serif Display**, **Playfair Display**, or **Fraunces** (warm serif)
- Body: **Inter**, **Plus Jakarta Sans**, or **DM Sans** (clean sans-serif)
- Accent: **Space Grotesk** or **Outfit** (geometric sans-serif)

### Interaction Patterns
1. **Card-based dish browsing** with large food imagery (dominant pattern)
2. **Swipe gestures** for discovery (Tinder-style save/skip)
3. **Vertical scroll + horizontal category carousels** (UberEats/DoorDash pattern)
4. **Map view** for nearby dishes (not restaurants)
5. **Micro-interactions** with haptic feedback
6. **Progressive disclosure** for nutritional data

### Apps to Study
- **Fitia** (4.9 rating, 10M users) — cleanest free nutrition UI
- **Lifesum** — colorful, makes tracking enjoyable
- **Yuka** — scan-to-score simplicity
- **Noom** — psychology-driven onboarding, color-coded food categories

Sources: [Dribbble nutrition-app](https://dribbble.com/tags/nutrition-app), [DesignRush](https://www.designrush.com/best-designs/apps/nutrition), [Jellybean Creative](https://www.jellybeancreative.co.uk/2026/02/25/graphic-design-trends-2026/), [Envato Color Trends](https://elements.envato.com/learn/color-trends)

---

## Agent Learning Sources (for daily ingestion)

### RSS Feeds (no auth needed)
- Smashing Magazine: `https://www.smashingmagazine.com/feed/`
- CSS-Tricks: `https://css-tricks.com/feed/`
- Codrops: `https://tympanus.net/codrops/feed/`
- DEV.to frontend: `https://dev.to/feed/tag/frontend`
- DEV.to nextjs: `https://dev.to/feed/tag/nextjs`
- Planet PostgreSQL: `https://planet.postgresql.org/rss20.xml`
- HN nutrition: `https://hnrss.org/newest?q=nutrition`
- Reddit r/nutrition: `https://www.reddit.com/r/nutrition/.rss`
- Reddit r/mealprep: `https://www.reddit.com/r/MealPrepSunday/.rss`

### APIs (free, no auth)
- HN Algolia: `https://hn.algolia.com/api/v1/search?query=food+app`
- USDA FoodData Central: `https://fdc.nal.usda.gov/api-guide`
- Open Food Facts: `https://world.openfoodfacts.org/data`

### GitHub Repos to Monitor
- `shadcn-ui/ui` (75k+ stars) — component library
- `pgvector/pgvector` — vector search
- `taskforcesh/bullmq` — job queue
- `magicuidesign/magicui` (19k+ stars) — animated components
- `vercel/next.js` — framework
- `bradtraversy/design-resources-for-developers` (58k+ stars)

### Design Inspiration (scrapable)
- Dribbble tags: `nutrition-app`, `food-app-ui`, `health-app`
- Behance: `behance.net/search/projects/food%20app`
- Screenlane: `screenlane.com`
- Mobbin: `mobbin.com`
- Shadcn Blocks: `shadcnblocks.com` (1,423 blocks)
- Magic UI: `magicui.design` (50+ animated components)

### App Review Scraping
- `google-play-scraper` (npm) — no API key needed
- `app-store-scraper` (npm) — no API key needed
- Target apps: MyFitnessPal, Cronometer, Lose It, Fig, SnapCalorie

---

## Branding Corner

### Current Problem
"NutriScout" sounds generic — Nutri-prefix is overused (NutriScan, Nutrify, NutriTracker). Doesn't convey the dish-first, AI-powered, real-time nature of the app.

### What the Name Should Convey
- Dish-first discovery (not restaurant-first)
- Intelligence/AI-powered
- Speed/real-time
- Appeals to fitness, dietary restriction, and foodie audiences
- Makes people go "BAM, what is that?"

### Initial Name Brainstorm (to be expanded Saturday)
- Need to explore: compound words, unexpected metaphors, action verbs, food-adjacent language
- Study successful rebrands: Weight Watchers -> WW, MyFitnessPal's dominance through name recognition
- Consider: how does the name look as an app icon? How does it sound in conversation?

**Full branding deep-dive scheduled for Saturday rotation.**

---

## Recommended Pricing Strategy
- **Free tier**: Limited dish searches/day, basic dietary filters
- **Premium**: $7.99-$9.99/month or $69.99-$79.99/year
- **Paywall the AI**: Photo macro estimation, personalized rerouting, live wait times
- Sweet spot: above YAZIO ($48) and Cronometer ($50), competitive with MFP ($80-$100)

---

## This Week's Top Priorities
1. **Branding** — find the "BAM" name before going further
2. **Color/typography system** — implement the warm minimalism palette
3. **Dish card component** — card-based layout with large food imagery
4. **Competitor gap** — nobody combines dish discovery + multi-restriction + macros + delivery
5. **Halal/kosher** — massively underserved, build for these users early
