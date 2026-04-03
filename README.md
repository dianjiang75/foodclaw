# FoodClaw

**Search by dish, not by restaurant.** FoodClaw is an AI-powered food discovery platform that finds restaurant dishes matching your dietary restrictions and nutritional goals — with real confidence intervals, not fake precision.

> "Show me high-protein vegan dishes near me, sorted by shortest wait time."

---

## Why FoodClaw?

Every food app today is **restaurant-first**. You pick a restaurant, then hope the menu has something you can eat. FoodClaw flips that: you describe *what you want to eat* and it finds *where to get it*.

- **Macro ranges, not guesses** — Calories/protein/carbs/fat shown as min-max ranges that widen honestly based on data quality
- **Allergy safety layer** — A dedicated evaluator enforces 85%+ confidence for allergy-critical flags (nut-free, gluten-free, dairy-free) before showing a dish
- **AI vision analysis** — Gemini Flash analyzes food photos to estimate portion sizes and macros, cross-validated across multiple photos using outlier detection
- **Real-time logistics** — Current wait times, foot traffic patterns, and delivery platform availability
- **Self-improving** — Nightly automation agents research, implement fixes, and validate changes without human intervention

---

## How It Works

```
User searches "tofu" + vegan + max protein + 2mi radius
                           |
                    +--------------+
                    |    Search    |     Redis cache check (5min TTL)
                    | Orchestrator |     Full-text + dietary + geo filters
                    +--------------+     Macro sorting & pagination
                           |
                    +--------------+
                    |   Evaluator  |     Allergy safety gate (85% confidence)
                    |   (Apollo)   |     Keyword scan for hidden allergens
                    +--------------+     Warning labels on uncertain dishes
                           |
          +-------+--------+--------+-------+
          |       |        |        |       |
       Dishes  Photos   Reviews  Traffic  Delivery
       w/macros  w/AI   sentiment wait-min  Uber/DD
                 est.   analysis  by hour   avail.
```

---

## Tech Stack

| | |
|---|---|
| **App** | Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, shadcn/ui |
| **Database** | PostgreSQL 17 + pgvector + earthdistance, Prisma 7 |
| **Cache & Queue** | Redis 7 (ioredis), BullMQ workers |
| **AI** | Google Gemini Flash (vision), Anthropic Claude (text extraction), USDA FoodData Central |
| **APIs** | Google Places, Yelp Fusion, BestTime.app |
| **Deploy** | Railway (Dockerfile + railway.json) |

---

## Quick Start

```bash
# Prerequisites: Node 20+, PostgreSQL 17 (with pgvector), Redis 7

git clone https://github.com/dianjiang75/foodclaw.git
cd foodclaw
npm install
cp .env.example .env          # Fill in API keys (see below)

# Database
npx prisma migrate dev        # Run migrations
npm run db:seed               # Seed 18 NYC restaurants, 137 dishes

# Run
npm run dev                   # App on localhost:3000
npm run start:workers         # BullMQ workers (separate terminal)
```

### Environment Variables

| Variable | Required | Description |
|----------|:--------:|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `GEMINI_API_KEY` | Yes | Google Gemini (vision analysis) |
| `ANTHROPIC_API_KEY` | Yes | Claude (text extraction, reviews) |
| `GOOGLE_PLACES_API_KEY` | Yes | Restaurant discovery + photos |
| `USDA_API_KEY` | Yes | Nutrition data lookups |
| `YELP_API_KEY` | No | Review aggregation (fallback to Google) |
| `BESTTIME_API_KEY` | No | Foot traffic forecasts |

---

## Architecture

### Core Agents

| Agent | What it does | Key detail |
|-------|-------------|------------|
| **Vision Analyzer** | Estimates macros from food photos | Gemini Flash, batch of 3, MAD outlier detection across multiple photos |
| **Menu Crawler** | Scrapes restaurant menus from websites, Google Photos, delivery platforms | Conservative dietary flags: `null` (unknown) over `true` (assumed safe) |
| **Review Aggregator** | Extracts dish-level sentiment from Google + Yelp reviews | Links reviews to individual dishes, not just restaurants |
| **Logistics Poller** | Tracks foot traffic and wait times by day/hour | Google Popular Times + linear regression for wait estimates |
| **Search Orchestrator** | Full search pipeline: cache -> filter -> query -> enrich -> evaluate -> sort | Geo pre-filter, restaurant diversity cap (max 3 dishes per restaurant) |
| **Apollo Evaluator** | Post-search dietary safety verification | 85% confidence for allergens, 90% for known risky dishes (Pad Thai + nut-free) |

### Background Workers (BullMQ)

Four workers process async jobs with rate limiting, exponential backoff, and deduplication:

- **Crawl Worker** — Menu extraction (10/min, concurrency 3)
- **Photo Worker** — Vision analysis (concurrency 3, skips <40% confidence)
- **Review Worker** — Sentiment aggregation (20/min, concurrency 5)
- **Logistics Worker** — Traffic polling (20/min, 15min cache)

### Dietary Safety

The evaluator is the last gate before results reach the user:

| Restriction | Allergy-Critical? | Min Confidence | Special Cases |
|-------------|:-----------------:|:--------------:|---------------|
| Nut-free | Yes | 85% | Pad Thai, Kung Pao, Baklava require 90% |
| Gluten-free | Yes | 85% | Ramen, pasta, croissants require 90% |
| Dairy-free | Yes | 85% | Alfredo, carbonara require 90% |
| Vegan / Vegetarian | No | 70% | — |
| Halal / Kosher | No | 70% | — |

Dishes below the threshold are either removed or shown with a warning label. The system prefers false negatives (hiding a safe dish) over false positives (showing an unsafe one).

### Cache Strategy

| Data | TTL | Why |
|------|-----|-----|
| USDA nutrition | 30 days | Stable reference data |
| Restaurant menus | 7 days | Menus change slowly |
| Review summaries | 3 days | New reviews trickle in |
| Foot traffic | 15 min | Changes throughout the day |
| Search results | 5 min | Balances freshness and speed |

---

## Nightly Automation

FoodClaw runs a self-improvement loop every night via macOS launchd (6 sequential agents):

```
2:00 AM  /pipeline   — Fix menu crawling, photo analysis, USDA matching
         /backend    — Database indexes, caching, Redis, connection pooling
         /search     — Search orchestrator, distance filtering, pagination
         /api        — External API integrations, rate limiting, validation
         /frontend   — UI components, mobile UX, loading states
6:00 AM  /quality    — Lint, test, check for regressions, write metrics report
```

Each agent researches the web, reads the codebase, implements changes, validates with tests, and reverts on failure. The quality agent runs last as a safety gate.

Reports are written to `agent-workspace/improvement-logs/` with before/after metrics.

---

## API

All responses use `{ success: true, data: ... }` or `{ success: false, error: ... }` envelope.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/search` | Search dishes by location, diet, macros, text |
| `GET` | `/api/dishes/[id]` | Dish detail (macros, photos, reviews, similar) |
| `GET` | `/api/dishes/[id]/similar` | Vector similarity search |
| `GET` | `/api/dishes/[id]/photos` | Photo gallery with AI macro estimates |
| `GET` | `/api/restaurants` | Browse restaurants by location |
| `GET` | `/api/restaurants/[id]` | Restaurant detail |
| `GET` | `/api/restaurants/[id]/menu` | Full menu with nutrition data |
| `GET` | `/api/restaurants/[id]/traffic` | Foot traffic by day + hour |
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/auth/login` | Login (returns JWT) |
| `POST` | `/api/favorites` | Toggle dish favorite |
| `POST` | `/api/feedback` | Community feedback (portions, corrections, photos) |
| `POST` | `/api/crawl/restaurant` | Trigger on-demand menu crawl |
| `POST` | `/api/crawl/area` | Discover restaurants in radius |
| `GET` | `/api/health` | DB + Redis health check |

### Example Search

```
GET /api/search?lat=40.7264&lng=-73.9878&q=tofu&diet=vegan&goal=max_protein&radius=2&limit=20
```

Returns dishes with macro ranges, confidence scores, review summaries, wait times, and delivery options — all filtered through the safety evaluator.

---

## Data Pipeline

```bash
# Crawl a single restaurant
npx tsx scripts/crawl-restaurant.ts <google_place_id>

# Discover restaurants in an area
npx tsx scripts/seed-area.ts <lat> <lng> <radius_miles>

# Nightly full crawl
npx tsx scripts/nightly-crawl.ts

# Compute vector embeddings for similarity search
npx tsx scripts/compute-embeddings.ts
```

---

## Deploy to Railway

1. Push to GitHub
2. Create Railway project, connect repo
3. Add **Postgres** + **Redis** plugins (env vars auto-injected)
4. Enable extensions: `pgvector`, `cube`, `earthdistance`
5. Add worker service with start command: `npm run start:workers`
6. Set API keys manually
7. First deploy: `npm run db:seed` via Railway shell

---

## Tests

```bash
npm test              # 110 tests, 17 suites
npx tsc --noEmit      # Type check
npm run build         # Production build
```

---

## Seed Data

The demo seed covers NYC's East Village with:
- 18 restaurants across Italian, Thai, Indian, Korean, Chinese, American, etc.
- 137 dishes with dietary flags, macros, and ingredient data
- 409 photos queued for vision analysis
- 105 review summaries
- 90 logistics entries (traffic by hour)
- 18 delivery platform listings

---

## Project Structure

```
src/
  app/                      Pages + API routes (Next.js App Router)
  lib/
    orchestrator/           Search pipeline (Atlas)
    evaluator/              Dietary safety (Apollo)
    agents/
      vision-analyzer/      Gemini Flash macro estimation
      menu-crawler/         Restaurant menu scraping
      review-aggregator/    Sentiment analysis
      logistics-poller/     Wait times + foot traffic
      similarity/           pgvector dish search
    db/                     Prisma client + geo queries
    cache/                  Redis helpers
    usda/                   USDA API + 100+ ingredient synonyms
    auth/                   JWT + middleware
    ai/                     Gemini, Claude, OpenAI clients
  components/               UI (dish cards, macro bars, filters, nav)
workers/                    BullMQ background processors
scripts/                    Crawl, seed, and maintenance scripts
prisma/                     Schema + migrations
agent-workspace/            Nightly agent reports + learning digests
```

---

## License

Proprietary. All rights reserved.
