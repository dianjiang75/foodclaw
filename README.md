# NutriScout

**Dish-first food discovery platform.** Find restaurant dishes that match your dietary needs and nutritional goals using AI-powered menu analysis, photo-based macro estimation, and community feedback.

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                    Next.js 16 Frontend               │
│  Onboarding → Search Feed → Dish Detail → Profile    │
└──────────────┬───────────────────────────────────────┘
               │ REST API (/api/*)
┌──────────────▼───────────────────────────────────────┐
│                   API Routes Layer                    │
│  auth · search · dishes · restaurants · feedback     │
└──────┬───────────────────────────────────┬───────────┘
       │                                   │
┌──────▼──────┐  ┌───────────┐  ┌─────────▼──────────┐
│   Atlas     │  │  Apollo   │  │  Background Workers │
│ Orchestrator│──│ Evaluator │  │  (BullMQ + Redis)   │
└──┬──────────┘  └───────────┘  └──────┬──────────────┘
   │                                    │
┌──▼────────────────────────────────────▼──────────────┐
│                    Agent Layer                         │
│ Vision Analyzer · Menu Crawler · Review Aggregator    │
│ Logistics Poller · Similarity Engine                  │
└──┬──────────┬───────────┬──────────────┬─────────────┘
   │          │           │              │
┌──▼──┐ ┌────▼───┐ ┌─────▼────┐ ┌──────▼──────┐
│USDA │ │Claude  │ │Google    │ │BestTime.app │
│ API │ │Vision  │ │Places/   │ │(foot        │
│     │ │API     │ │Yelp      │ │ traffic)    │
└─────┘ └────────┘ └──────────┘ └─────────────┘
               │
        ┌──────▼──────┐
        │ PostgreSQL   │
        │ + pgvector   │
        │ Redis cache  │
        └──────────────┘
```

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS v4, shadcn/ui
- **Backend:** Next.js API Routes, TypeScript
- **Database:** PostgreSQL 17 with pgvector, cube, earthdistance extensions
- **Cache:** Redis 7 (ioredis) with multi-tier TTL strategy
- **Queue:** BullMQ for background crawl and logistics jobs
- **AI:** Anthropic Claude (Sonnet for real-time, Haiku for batch)
- **APIs:** USDA FoodData Central, Google Places, Yelp Fusion, BestTime.app

## Setup

### Prerequisites

- Node.js 20+
- PostgreSQL 17 with pgvector extension
- Redis 7

### Install

```bash
cd nutriscout
npm install
```

### Environment

Copy `.env.example` to `.env` and fill in values:

```bash
cp .env.example .env
```

Key variables:
- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string
- `ANTHROPIC_API_KEY` — Claude API key
- `GOOGLE_PLACES_API_KEY` — Google Places API key
- `USDA_API_KEY` — USDA FoodData Central API key
- `YELP_API_KEY` — Yelp Fusion API key

### Database

```bash
npx prisma migrate dev
npx prisma generate
node --import tsx scripts/post-migrate.sql  # Enable pgvector extensions
```

### Seed Demo Data

```bash
npx tsx scripts/seed-demo.ts
```

This creates 18 restaurants in NYC's East Village with 8 dishes each (140+ dishes total), including mock traffic data, delivery options, review summaries, and photos.

### Run

```bash
# Dev server
npm run dev

# Background workers (separate terminal)
npx tsx workers/crawl-worker.ts
npx tsx workers/logistics-worker.ts
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check (DB + Redis) |
| POST | `/api/auth/register` | Create user profile |
| POST | `/api/auth/login` | Login by email |
| PATCH | `/api/users/profile` | Update preferences |
| GET | `/api/search` | Search dishes by location, diet, goals |
| GET | `/api/dishes/[id]` | Dish detail with macros and reviews |
| GET | `/api/dishes/[id]/similar` | Find similar dishes nearby |
| GET | `/api/dishes/[id]/photos` | Dish photo gallery |
| GET | `/api/restaurants/[id]` | Restaurant detail |
| GET | `/api/restaurants/[id]/menu` | Restaurant menu |
| GET | `/api/restaurants/[id]/traffic` | Current foot traffic |
| POST | `/api/feedback` | Submit community feedback |
| POST | `/api/crawl/restaurant` | Trigger on-demand crawl |
| POST | `/api/crawl/area` | Discover restaurants in area |

## Crawl Pipeline

### On-demand (single restaurant)

```bash
npx tsx scripts/crawl-restaurant.ts <google_place_id>
```

### Area discovery

```bash
npx tsx scripts/seed-area.ts <latitude> <longitude> <radius_miles>
```

### Nightly full crawl

```bash
npx tsx scripts/nightly-crawl.ts
```

## Tests

```bash
# Run all tests
npx jest --no-cache

# Type check
npx tsc --noEmit

# Build
npx next build
```

## Key Design Decisions

1. **Dietary safety first.** Apollo evaluator uses strict 0.85 confidence threshold for allergy-critical flags (nut_free, gluten_free). False negatives preferred over false positives.

2. **Macros show ranges, not false precision.** Confidence intervals widen based on data source: restaurant-published (±5%), vision AI 10+ photos (±15%), 2-3 photos (±25%), 1 photo (±35%).

3. **Cache-first responses.** Redis multi-tier cache serves instant results. Live data (traffic, delivery) loads progressively. Target: <2 second initial page load.

4. **Ensemble analysis.** Multiple photo analyses are combined using MAD (Median Absolute Deviation) outlier detection for robust macro estimation.

5. **Rate limiting.** Sliding-window rate limiter on all external APIs (USDA: 3600/hr, Yelp: 5000/day).
