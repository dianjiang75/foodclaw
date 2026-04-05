# Quality Gate Report — 2026-04-05

## Metrics

| Metric          | Before (start of run) | After (post-fix) |
|-----------------|-----------------------|-------------------|
| tsc errors      | 0                     | 0                 |
| lint errors     | 0                     | 0                 |
| lint warnings   | 15                    | 15                |
| tests passing   | 191                   | 193               |
| tests failing   | 2                     | 0                 |

## Regressions Found & Fixed

### 1. Cache test — `invalidateRestaurant` (FIXED)
Backend agent changed `invalidateRestaurant()` from SCAN-based to tag-based invalidation (using Redis SET + smembers + pipeline DEL). The test still mocked `scan` and expected SCAN-based behavior.
- **Fix**: Updated test to mock `smembers` and `pipeline`, assert against tag key `cache-tag:restaurant:{id}`.
- **File**: `__tests__/cache/index.test.ts`

### 2. Crawl API test — missing `apiSuccess` envelope (FIXED)
API agent wrapped crawl area response in `apiSuccess()` envelope, but the test asserted `body.restaurants_found` instead of `body.data.restaurants_found`.
- **Fix**: Updated assertions to use `body.data.*`.
- **File**: `__tests__/api/crawl.test.ts`

## Agent Changes Summary

- **Discovery**: 15 new areas added (30 total), coordinate dedup fix in seed script
- **Pipeline**: Photo analysis via BullMQ addBulk(), failed ingredient batches no longer silently dropped, improved category detection
- **Backend**: Tag-based cache invalidation replacing SCAN, cache error swallowing
- **Search**: Geo duplicate query eliminated (geoResultsCache reuse)
- **API**: Rate limiting on 5 unprotected routes, UUID validation on menu route, apiSuccess/apiError envelopes
- **Frontend**: ConfidenceDot 24px touch target, focus ring opacity fix, LCP priority images, dark mode brightness, search debounce, safe-area padding, aria-labels

## Lint Warnings (15, all pre-existing)
All are `@typescript-eslint/no-unused-vars` — intentional prefixed vars (`_secret`, `_user`) or test helpers. No action needed.

## No Conflicts Detected
No files were edited by multiple agents in conflicting ways.
