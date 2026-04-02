# Session Handoff — 2026-04-02

## What This Session Did

This was the **"AGENTIC FOOD - learning schedule"** session. Over ~12 hours we built the entire autonomous self-improvement infrastructure and implemented 50+ code changes.

---

## Infrastructure Built

### 1. Nightly Automation (macOS launchd)
| Time | Agent | Plist |
|------|-------|-------|
| 2:00 AM | `/learn` — researches all areas | `~/Library/LaunchAgents/com.nutriscout.learn-agent.plist` |
| 4:00 AM | `/improve` — implements from digests | `~/Library/LaunchAgents/com.nutriscout.improve-agent.plist` |
| 2:00 AM | 6 area agents (sequential) | `~/Library/LaunchAgents/com.nutriscout.nightly-agents.plist` |
| 6:00 AM | `/user-test` — 5 mock customer personas | `~/Library/LaunchAgents/com.nutriscout.user-test-agent.plist` |

### 2. Skills Created/Modified (in `.claude/skills/`)
| Skill | Purpose |
|-------|---------|
| `/learn` | Daily research across all areas, writes digests with actionable summaries |
| `/improve` | Reads digests + backlog, implements GREEN/YELLOW changes, validates |
| `/pipeline` | Menu crawling, photo analysis, USDA matching, nutrition resolver |
| `/backend` | Database, caching, Redis, BullMQ, connection pooling |
| `/search-agent` | Orchestrator, evaluator, similarity, distance, pagination |
| `/api-agent` | External APIs, rate limiting, error handling, auth |
| `/frontend` | UI components, pages, search UX, mobile, accessibility |
| `/quality` | Lints, tests, regressions, writes final improvement log |
| `/user-test` | 5 mock customer personas test the app end-to-end |

### 3. Learning Loop (runs every 30 min in active sessions)
Rotation: pipeline → backend → search-agent → api-agent → frontend → quality
Track file: `agent-workspace/logs/learning-rotation.txt` (currently: `search-agent`)
Each cycle: research online + GitHub → cross-reference code → present top 5 → implement approved → validate

### 4. Verify-Fix Loop (runs every 10 min in active sessions)
7 API checks + TSC + lint. Fixes issues and updates BACKLOG.md.

### 5. Mock Customer Personas
| Persona | Focus |
|---------|-------|
| Explorer Emma | Discovery, categories, search, empty states |
| Protein Pete | Macro filtering, protein sort, calorie caps |
| Allergy Alice | Dietary safety, evaluator thresholds (SAFETY CRITICAL) |
| Speedy Sam | Wait time sort, distance, delivery |
| Foodie Fiona | Reviews, photos, macro transparency |

Reports: `agent-workspace/user-test-reports/`
Backlog: `agent-workspace/user-test-reports/BACKLOG.md`

---

## Code Changes Made (Summary)

### Pipeline (12 changes)
- JSON-LD/Schema.org menu extraction
- Image preprocessing (Sharp resize to 1024x768)
- USDA `requireAllWords` + rate limit fix (3600→900/hr)
- USDA query decomposition for compound ingredient names
- BullMQ job chaining: crawl → photo analysis (new `photo-worker.ts`)
- Macro estimation margins widened (±20%/±35%/±50% per research)
- Robust `extractJson()` utility for LLM response parsing
- `fetchWithRetry` wired into Google Places + Yelp API calls
- Gemini structured output (`responseMimeType: "application/json"`)
- Dead letter queue for exhausted jobs
- Image quality check (brightness thresholds)
- Photo worker confidence filter (<40% = skip)

### Backend (8 changes)
- GIN index with `jsonb_path_ops` for dietary flags
- Full-text search tsvector generated column + GIN index
- Redis health check with `enableReadyCheck` + retry strategy
- Prisma connection pool config (max 10, 30s timeout)
- Earthdistance + full-text search raw SQL helpers (`db/geo.ts`)
- HNSW index for pgvector (replaced IVFFlat)
- Cache key includes calorieLimit, proteinMin, allergens
- Seed logistics for all 24 hours × 7 days

### Search (10 changes)
- Full-text search wired into orchestrator (replaces ILIKE)
- ILIKE fallback searches both name AND description
- Simple dictionary fallback for foreign food terms (sushi, ramen)
- Cache full result window (top 100) for pagination
- Wait-time in-memory sort after logistics enrichment
- Rating sort with nulls-last (in-memory)
- Z-score similarity normalization
- Configurable evaluator thresholds + expanded ALLERGY_CRITICAL
- Default relevance scoring (rating 35% + proximity 25% + reviews 15% + confidence 15% + photo 10%)
- Search autocomplete endpoint (`/api/search/suggest`)

### API (7 changes)
- Standardized API response helpers (`apiSuccess`, `apiError`, etc.)
- `fetchWithRetry` with exponential backoff + jitter
- Health check expanded (DB + Redis + Google + USDA, parallel with 3s timeout)
- Structured logger (JSON prod, pretty dev)
- Rate limiting on favorites + profile routes
- Zod input validation on search API
- Allergen-to-dietary-flag mapping in evaluator

### Frontend (15 changes)
- Font: Geist → Plus Jakarta Sans
- Color system: warm cream background, emerald primary, coral accent
- Dark mode: next-themes + deep navy palette + ThemeToggle button
- Dish card: hover lift, photo zoom, rating overlay, 16:10 aspect
- Macro bar: colored dots, tabular-nums, compact mode, highlight fix
- Category pills: scroll arrows with fade edges
- Photo carousel: CSS scroll-snap swipe + dot scroll-to + photo counter
- Empty states: icon + description + suggestions
- Loading: shimmer skeleton animation
- Error boundaries: error.tsx + not-found.tsx
- Global loading.tsx skeleton
- Sort pills with icons (Sparkles, MapPin, Star, Clock)
- Search placeholder: "What are you craving?"
- 3-column dish grid
- Similar dishes uses geolocation (not hardcoded NYC)

### Quality (6 changes)
- Fixed 2 `require()` → ESM imports in tests
- Fixed `setState in effect` lint errors (auth context + ThemeToggle)
- Added test suites: parse-json, api-response, fetch-retry, search validation
- Fixed cache key test expectations
- Fixed vision analyzer test mocks (added Gemini client mock)
- Fixed terms page unescaped quotes

---

## Current Metrics
- **TSC**: 0 errors
- **Lint**: 0 errors, 6 warnings
- **Tests**: 123/125 pass (2 pre-existing: vision batch concurrency, logistics stub)
- **API checks**: All 7 pass (thai, calorie, wait, allergy, rating, tsc, lint)

## Files Created This Session (20+)
- `src/lib/utils/api-response.ts`
- `src/lib/utils/fetch-retry.ts`
- `src/lib/utils/logger.ts`
- `src/lib/utils/parse-json.ts`
- `src/lib/db/geo.ts`
- `src/lib/validation/search.ts`
- `src/components/theme-toggle.tsx`
- `src/components/theme-provider.tsx`
- `src/components/icons/food-icons.tsx`
- `src/app/error.tsx`
- `src/app/not-found.tsx`
- `src/app/loading.tsx`
- `src/app/api/search/suggest/route.ts`
- `workers/photo-worker.ts`
- `scripts/compute-embeddings.ts`
- `.claude/skills/user-test/SKILL.md`
- `agent-workspace/user-test-reports/BACKLOG.md`
- `agent-workspace/user-test-reports/2026-04-01-user-test.md`
- `agent-workspace/improvement-logs/2026-03-31-*.md` (multiple)
- `agent-workspace/learning-digests/2026-04-01-quality.md`
- `~/Library/LaunchAgents/com.nutriscout.user-test-agent.plist`

## Pending Research Findings (Not Yet Implemented)

### From last search-agent cycle (user said "all" but context ran out):
1. Restaurant diversity in results (max 3 per restaurant)
2. Search uses logged-in user's saved dietary preferences
3. Search engagement tracking (`/api/events`)
4. Materialized view for popular dishes
5. Recently viewed dishes carousel

### From last backend cycle (presented but not approved):
1. Workers missing removeOnComplete/removeOnFail
2. Slow query detection via Prisma `$on('query')`
3. Redis maxmemory policy documentation
4. Migration strategy documentation
5. Database backup documentation

### From last pipeline cycle (user said "all", implemented):
All 5 were implemented (Gemini structured output, DLQ, quality check, confidence filter)

### From last frontend cycle (presented but not approved):
1. IntersectionObserver infinite scroll (replace Load More button)
2. Search typeahead dropdown (wire suggest API to UI)
3. Blur placeholders on food images
4. PWA service worker for offline
5. RSC streaming for dish detail page

### From last api-agent cycle (presented but not approved):
1. Composable API route handler wrapper
2. Google Places API v2 migration
3. API response compression
4. Per-user rate limiting (token bucket)
5. Rate limiting on suggest endpoint

## How to Continue

1. Open a new chat labeled "AGENTIC FOOD - learning schedule"
2. The shared state files will auto-load from CLAUDE.md
3. Say: "Continue the learning and improvement loops from where we left off"
4. The rotation is at `search-agent` — next would be `api-agent`
5. The verify-fix loop should be restarted with `/loop 10m`
6. The learning loop should be restarted with `/loop 30m`
7. Check `agent-workspace/logs/learning-rotation.txt` for current position
