# Improvement Log — 2026-03-31
**Digests Used**: 2026-03-30-deep-ui-design-system.md, 2026-03-30-deep-coding-architecture.md, 2026-03-30-deep-security-privacy.md
**Changes Made**: 10 applied / 10 attempted
**Risk Tiers**: 7 GREEN, 3 YELLOW, 0 orange skipped, 0 red skipped

## Baseline Metrics
| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| Type errors | 1 (generated .next/) | 0 | **-1** |
| Lint problems | 18 (6 errors, 12 warnings) | 8 (2 errors, 6 warnings) | **-10** |
| Test pass rate | 110/110 (100%) | 110/110 (100%) | 0 |
| TODO/FIXME count | 0 | 0 | 0 |

## Changes Applied

### 1. Fix SourceIcon created-during-render bug
**Tier**: YELLOW
**File(s)**: `src/app/dish/[id]/page.tsx`
**Source**: Lint error `react-hooks/static-components` (line 391)
**What**: `getSourceIcon()` now returns JSX elements instead of component references, eliminating the "component created during render" React error
**Metric impact**: -1 lint error

### 2. Remove unused `parseHtmlMenu` import
**Tier**: GREEN
**File(s)**: `src/lib/agents/menu-crawler/index.ts`
**Source**: deep-coding-architecture digest — unused imports waste bundle
**What**: Removed unused import of `parseHtmlMenu` (it's still re-exported from the barrel)
**Metric impact**: -1 lint warning

### 3. Remove unused `dishesUpserted` variable
**Tier**: GREEN
**File(s)**: `src/lib/agents/menu-crawler/index.ts`
**Source**: lint warning `no-unused-vars`
**What**: Removed counter variable that was incremented but never read
**Metric impact**: -1 lint warning

### 4. Fix `let` to `const` for `currentCategory`
**Tier**: GREEN
**File(s)**: `src/lib/agents/menu-crawler/sources.ts`
**Source**: lint error `prefer-const` (line 110)
**What**: Changed `let currentCategory` to `const` since it's never reassigned
**Metric impact**: -1 lint error

### 5. Fix destructuring unused variable in evaluator
**Tier**: GREEN
**File(s)**: `src/lib/evaluator/index.ts`
**Source**: lint warning `no-unused-vars` for `_`
**What**: Changed `[_, v]` to `[, v]` (proper unused destructuring syntax)
**Metric impact**: -1 lint warning

### 6. Remove unused `radiusMeters` and `categoryWhere` in orchestrator
**Tier**: GREEN
**File(s)**: `src/lib/orchestrator/index.ts`
**Source**: lint warnings for assigned-but-never-used variables
**What**: Removed `radiusMeters` calculation and `categoryWhere` assignment + the `buildCategoryWhere` function (empty stub)
**Metric impact**: -3 lint warnings

### 7. Replace `any` type in page.tsx delivery mapping
**Tier**: GREEN
**File(s)**: `src/app/page.tsx`
**Source**: lint error `no-explicit-any`
**What**: Changed `(del: any) => del.platform` to `(del: { platform: string }) => del.platform`
**Metric impact**: -1 lint error

### 8. Replace `<a>` with `<Link>` in profile page
**Tier**: GREEN
**File(s)**: `src/app/profile/page.tsx`
**Source**: lint error `no-html-link-for-pages` — Next.js requires `<Link>` for internal navigation
**What**: Replaced `<a href="/">` with `<Link href="/">` and added import
**Metric impact**: -1 lint error

### 9. Add accessibility skip link to layout
**Tier**: YELLOW
**File(s)**: `src/app/layout.tsx`
**Source**: deep-ui-design-system digest — WCAG 2.1 SC 2.4.1 requires skip navigation
**What**: Added "Skip to main content" link (sr-only, visible on focus) and wrapped children in `<main id="main-content">`
**Metric impact**: Accessibility improvement (WCAG compliance)

### 10. Add aria-label to ConfidenceDot + bundle optimization
**Tier**: YELLOW
**File(s)**: `src/components/confidence-dot.tsx`, `next.config.ts`
**Source**: deep-ui-design-system digest — accessibility; deep-coding-architecture digest — tree shaking
**What**: Added descriptive `aria-label` to TooltipTrigger; added `optimizePackageImports: ["lucide-react"]` to Next.js config for better tree-shaking
**Metric impact**: Accessibility + smaller client bundle

## Remaining Lint Issues (8)
- 2 errors in `__tests__/usda/client.test.ts` — `require()` imports in tests (needs test refactor)
- 6 warnings — `<img>` vs `<Image>`, stub function params, unused test import (lower priority)

## Next Run Suggestions
- Convert `<img>` to `next/image` `<Image>` in dish-card.tsx and dish detail page (requires configuring image domains)
- Add error boundary pages (`src/app/error.tsx`, `src/app/not-found.tsx`)
- Add Zod input validation on search API endpoint
- Add loading states for dish detail page (parallel data fetching with `Promise.all`)
