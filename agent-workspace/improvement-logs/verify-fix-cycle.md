# Verify-Fix Cycle — 2026-04-01

## API Verification (All Pass)
| Check | Result |
|-------|--------|
| Thai category filter | ✅ 3 dishes |
| Calorie cap 400 | ✅ 0 violations |
| Wait time data | ✅ 5/5 have data |
| Allergy nut_free+gluten_free | ✅ All safe |
| Rating sort | ✅ 5.0, 5.0, 4.9, 4.9, 4.9 |
| TypeScript | ✅ 0 errors |

## Issues Fixed This Cycle

### From 10 parallel verification agents:
1. **Cache key missing calorie/protein params** — fixed in cache/index.ts + orchestrator
2. **ILIKE fallback only searched name** — fixed to search name OR description
3. **English tsvector drops foreign food terms** — added simple dictionary fallback
4. **NULL ratings sorted first** — switched to in-memory sort with nulls last
5. **require() in tests** — converted to ESM imports

### From backlog MINOR issues:
6. **Photo carousel dot click** — now scrolls container with smooth animation via ref
7. **Similar dishes hardcoded location** — uses browser geolocation with NYC fallback
8. **Compact macro bar highlight** — compact mode now supports highlight prop for all macros including calories
9. **Cache test type errors** — added calorieLimit/proteinMin to all test param objects

## Remaining Open Issues
| Severity | Issue | Status |
|----------|-------|--------|
| MINOR | 3-col grid tight on very small phones | Open (design choice) |
| MINOR | Pad Thai 0.87 nut_free confidence | Open (edge case, within threshold) |
| MINOR | Only 1 photo per dish | Open (seed data limitation) |

## Verdict: **All clear.** 3 remaining MINOR issues are design decisions or seed data limitations, not bugs.
