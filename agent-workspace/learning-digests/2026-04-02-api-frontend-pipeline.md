# Learning Digest — 2026-04-02 (API + Frontend + Pipeline)

## Research Areas Covered
- API: Next.js route patterns, Google Places v2, Redis rate limiting, composable middleware
- Frontend: RSC streaming, image blur placeholders, WCAG 2.2 touch targets, mobile UX
- Pipeline: Gemini structured output, USDA synonym expansion, BullMQ job patterns

## Findings Implemented

### API Agent (5 implemented)
| # | Finding | Risk | Impact | Effort | Files Changed |
|---|---------|------|--------|--------|---------------|
| 1 | fetchWithRetry wired into menu crawler + crawl/area | GREEN | 8 | 2 | sources.ts, crawl/area/route.ts |
| 2 | Atomic rate limiter via Redis Lua script | GREEN | 7 | 4 | rate-limiter.ts |
| 3 | Standardized API response format (apiSuccess/apiError) | GREEN | 8 | 3 | 12 route files |
| 4 | Suggest endpoint rate limiting | GREEN | 5 | 1 | suggest/route.ts |

### Frontend Agent (2 implemented)
| # | Finding | Risk | Impact | Effort | Files Changed |
|---|---------|------|--------|--------|---------------|
| 1 | WCAG 2.2 touch targets (44px minimum) | GREEN | 8 | 3 | page.tsx, category-pills.tsx, dish/[id]/page.tsx |
| 2 | Search typeahead + infinite scroll (from handoff) | GREEN | 7 | 5 | search-typeahead.tsx, page.tsx |

### Pipeline Agent (3 implemented)
| # | Finding | Risk | Impact | Effort | Files Changed |
|---|---------|------|--------|--------|---------------|
| 1 | Gemini responseSchema for structured vision output | GREEN | 8 | 3 | vision-analyzer/index.ts |
| 2 | USDA synonym map expanded (30 → 100+ entries) | GREEN | 6 | 2 | usda/client.ts |
| 3 | Preparation-aware calorie adjustment (frying +15-20%) | GREEN | 7 | 3 | usda/client.ts, vision-analyzer/index.ts |

## Findings Deferred
- Google Places API v2 migration (YELLOW, effort 6) — needs integration testing
- RSC streaming for main page (YELLOW, effort 7) — major restructure
- Blur placeholders for images (GREEN, effort 4) — needs DB schema change
- BullMQ FlowProducer for crawl chains (YELLOW, effort 5) — needs worker testing
- Composable withRateLimit wrapper migration (GREEN, effort 4) — code hygiene

## CRITICAL Bugs Fixed (from user-test backlog)
1. Peanut sauce allergen: added singular forms ("peanut" not just "peanuts") to ALLERGEN_KEYWORDS
2. Allergens= code path: now applies ALLERGY_CRITICAL_MIN confidence gate (was missing)
3. Known allergen dishes: Pad Thai always gets warning even at high confidence
4. Known allergen list expanded: udon, nabeyaki, tiramisu, pizza, gyoza, etc.
5. Allergen description check: flag=true but description mentions allergen → exclude
6. Protein filter: changed from proteinMaxG to proteinMinG (more conservative)
7. Wait time boundary: strict < instead of <=
8. total_count: now reflects diversified/filtered count, not raw DB count
9. Restaurant diversity: cap without interleaving (preserves sort order)
