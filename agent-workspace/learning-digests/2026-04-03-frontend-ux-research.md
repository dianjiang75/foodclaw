# Frontend & UX Research Digest — 2026-04-03
**Agent**: Frontend & UX Research
**Topics**: Food app UX trends, React 19.2, Next.js 16, Tailwind v4, mobile patterns, accessibility, dietary UX, nutrition display, dark mode, haptics, RSC streaming, micro-animations, GLP-1 users
**Sources**: 20 web searches + 8 full article fetches

---

## 1. Next.js 16 — Critical Breaking Changes & New Features

**Impact: HIGH | Risk: RED (breaking) | Target files: `next.config.ts`, all API routes, `src/middleware.ts`**

### Breaking Changes Affecting FoodClaw Right Now

| What Changed | Required Action | File(s) |
|---|---|---|
| `middleware.ts` deprecated → `proxy.ts` | Rename file, rename export to `proxy` | `src/middleware.ts` |
| `params` and `searchParams` are now async | `await params`, `await searchParams` everywhere | `src/app/dish/[id]/page.tsx`, `src/app/restaurant/[id]/page.tsx`, `src/app/category/[id]/page.tsx` |
| `cookies()`, `headers()` are now async | `await cookies()`, `await headers()` | all API routes |
| `revalidateTag()` requires second arg | `revalidateTag(tag, 'max')` or use new `updateTag()` | anywhere cache tags are used |
| `experimental.ppr` flag removed | Replaced by `cacheComponents: true` | `next.config.ts` |
| `images.domains` deprecated | Use `images.remotePatterns` (already done) | `next.config.ts` (OK) |
| `images.minimumCacheTTL` default changed | Was 60s, now 4 hours — good for dish photos | `next.config.ts` |
| `images.qualities` changed | Default is now `[75]` not a range | `next.config.ts` |
| Parallel routes need explicit `default.js` | Build fails without them | any `@slot` directories |

### New Features Worth Adopting

**Cache Components (`"use cache"` directive)**
- Replaces `experimental.dynamicIO` — rename config key to `cacheComponents: true`
- Enables true opt-in caching: pages/components/functions all explicit
- Pairs with PPR: static shell served instantly, dynamic slots stream in
- New APIs: `updateTag()` for Server Actions (read-your-writes), `refresh()` for uncached data refresh
- `revalidateTag(tag, 'max')` — SWR semantics, user gets cached while background revalidation runs

```ts
// next.config.ts — enable Cache Components
const nextConfig = {
  cacheComponents: true,   // replaces experimental.dynamicIO
  reactCompiler: true,     // stable in Next.js 16
};
```

**React Compiler (stable)**
- Enable with `reactCompiler: true` in `next.config.ts`
- Removes need for manual `useMemo`, `useCallback`, `React.memo`
- FoodClaw has heavy use of `useCallback` in `dish-card.tsx` (`toggleFavorite`) and `page.tsx` (`fetchDishes`, `fetchRestaurants`) — compiler handles these automatically
- Install: `npm install babel-plugin-react-compiler@latest`
- Caveat: Higher build times (Babel dependency). Start with annotation mode: `{ compilationMode: "annotation" }` then go global
- Opt-out per component: `"use no memo"` directive
- Skip components that mutate props directly or call hooks conditionally

**React 19.2 Features**
- **View Transitions API**: Animate elements during navigation (`<ViewTransition>`) — perfect for dish card → dish detail page transitions
- **`<Activity>`**: Render background UI with `display: none` while preserving state — useful for pre-rendering the filter drawer off-screen
- **`useEffectEvent`**: Extract non-reactive logic from Effects — cleaner than `useCallback` for event handlers

**Enhanced Routing**
- Layout deduplication: shared layout downloaded once for all prefetched links — huge for the dish grid (50+ links share the same layout)
- Incremental prefetching: cancels requests when links leave viewport — reduces wasted bandwidth on scroll

**New `proxy.ts`**
```ts
// rename src/middleware.ts → src/proxy.ts
export default function proxy(request: NextRequest) {
  // same logic as before
}
```

---

## 2. React Compiler — What to Remove from FoodClaw

**Impact: MEDIUM | Risk: GREEN | Target files: `dish-card.tsx`, `page.tsx`, `search-typeahead.tsx`**

The compiler auto-inserts `useMemo`/`useCallback`/`React.memo`. Once enabled globally, these can be removed:

- `dish-card.tsx` line 42: `const toggleFavorite = useCallback(...)` — remove wrapper, keep logic
- `page.tsx` lines 74, 129: `fetchDishes = useCallback(...)`, `fetchRestaurants = useCallback(...)` — remove wrappers
- `search-typeahead.tsx` line 38: `fetchSuggestions = useCallback(...)` — remove wrapper

Migration approach: enable `compilationMode: "annotation"`, test, then switch to global. Run `eslint-plugin-react-compiler` to find redundant memos. Do NOT remove until compiler is confirmed working — manual memos are "safe but redundant" per React docs.

---

## 3. Tailwind CSS v4 — Already on v4, Patterns to Adopt

**Impact: MEDIUM | Risk: GREEN | Target files: `globals.css`, `next.config.ts`**

FoodClaw appears to already be on Tailwind v4 (CSS-first config). Key v4 patterns to confirm are in use:

- `@import "tailwindcss"` replaces `@tailwind` directives — verify in `globals.css`
- CSS variable theming via `@theme { }` block — check design tokens are using CSS vars
- `@property` registered custom properties for smooth animation of CSS vars (color transitions in dark mode)
- `color-mix()` for alpha variants instead of Tailwind opacity modifiers
- `box-decoration-clone` / `box-decoration-slice` (old `decoration-clone` removed)
- Tailwind v4 build is 5x faster full, 100x faster incremental — no action needed, it's automatic

**shadcn/ui + Tailwind v4**: The shadcn docs have a specific Tailwind v4 migration page (`ui.shadcn.com/docs/tailwind-v4`) — confirm all shadcn components are using v4 CSS var tokens, not the old JS config `theme.extend` approach.

---

## 4. Food App UX Trends 2026 — Key Patterns for FoodClaw

**Impact: HIGH | Risk: GREEN**

### Dish Card (`dish-card.tsx`)

**Current state**: Good foundation. Aspect ratio, gradient overlay, macro bar, confidence dot, favorite heart.

**Gaps identified**:
1. **No warnings surfacing on card** — `DishCardData` now has `warnings` field (added recently), and `page.tsx` maps `d.warnings` into it — but the card renders warnings only if `dish.warnings && dish.warnings.length > 0`. This IS wired now (lines 168-174). AGENTS.md note about this gap appears outdated. Verify the evaluator actually populates `d.warnings` in the API response.
2. **Macro highlight not visually distinct enough** — when `highlight = "protein"`, only the bar segment gets `brightness-110`. Consider adding a color-coded border or subtle glow to the entire card when a goal is active.
3. **No "safe" trust badge for allergen-clear dishes** — users with allergies need a positive signal ("Verified Nut-Free"), not just absence of warning. A small green shield icon when `macro_confidence >= 0.9` and allergen is explicitly `false` would build trust.
4. **Photo fade-in is good** — the `opacity-0 → data-[loaded=true]:opacity-100` pattern is correct. Consider adding a `blur-sm → blur-0` transition for perceived sharpness improvement during load.

### Search Typeahead (`search-typeahead.tsx`)

**Current state**: Strong implementation — debounced 200ms, AbortController, keyboard nav, ARIA combobox pattern.

**Gaps**:
1. **No query text highlighting in suggestions** — "bbq" typed should show **bbq** chicken highlighted in results. Baymard research: text differentiation is a top-9 autocomplete requirement that only 19% of sites get right.
2. **Suggestions show dish + restaurant only** — consider adding a category label pill (already in the data: `s.category`) as a visual grouping cue.
3. **5 suggestions is correct** — matches best practice of 5-8. No change needed.
4. **No "recent searches"** — when input is focused with empty value, show 3-4 recent searches from `localStorage`. Very high discoverability ROI.
5. **Placeholder text** — "What are you craving?" is excellent for dish discovery intent. Keep it.

### Filter Drawer (`filter-drawer.tsx`)

**Current state**: Bottom sheet (correct pattern), sticky Apply button, active count badge on trigger.

**Gaps**:
1. **No drag handle** — the `SheetContent` is missing a visual drag indicator at the top. WCAG recommendation: don't rely solely on cut-off content to imply scrollability. A `w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-3` handle should be added inside the SheetContent.
2. **Allergen section needs safety copy** — the current copy "Dishes containing these will be excluded" is good. Consider a small `⚠ Safety note: AI-detected. Always confirm with staff for severe allergies.` below. This is the trust signal pattern identified in allergy UX research.
3. **No "Apply" feedback** — the Apply button just closes the sheet. Consider a brief optimistic state: "Filtering..." for 300ms before results arrive.
4. **FDA Big 9 grouping is correct** — no change needed. The EU-14 extras group is a good progressive disclosure pattern.
5. **Button touch targets**: The filter pills use `py-2 px-3.5` — at ~32px height, this is below the WCAG 2.2 minimum of 24×24px but below the recommended 44×44px for primary interactions. Since these are secondary/filter UI, 32px is acceptable by WCAG 2.2, but consider `py-2.5` for comfort.

### Main Page (`page.tsx`)

**Infinite scroll vs pagination decision**: FoodClaw's current hybrid (IntersectionObserver infinite scroll + "Load More" fallback sentinel) is the right call for a discovery feed. Research confirms: infinite scroll for engagement/discovery, pagination for goal-oriented tasks. Dish discovery = engagement mode. Keep it.

**Virtualization gap**: The dish grid has no virtualization. At 20 dishes per page with images, this is fine. But after 3 "load more" cycles (60+ dishes), performance will degrade. Implement `react-window` or `@tanstack/react-virtual` when `dishes.length > 40`. The sentinel already guards against double-firing.

**Carousels**: The "Top Rated" and "High Protein" horizontal carousels on default browse are excellent progressive disclosure — show curated sections first, "All Dishes" below. This matches 2026 food app design trends (adaptive sections based on context). Consider adding a third carousel: "Near You" (distance sort) and/or "Under 500 cal" for calorie-focused users.

**Sort options**: The `min-h-[44px]` on sort buttons is excellent WCAG 2.2 touch target compliance.

---

## 5. Onboarding UX (`onboarding/page.tsx`)

**Impact: HIGH | Risk: GREEN**

**Current state**: 4-step wizard (info → dietary → goals → preferences). Progress bar. Card-per-step.

**Key research findings for dietary restriction onboarding**:
1. **Step 2 (dietary restrictions) should come FIRST** — research shows allergy/dietary safety is users' primary anxiety. Moving it before account creation reduces abandonment. Consider: Step 1 = dietary/goals, Step 2 = preferences, Step 3 = account creation (email last, like Duolingo).
2. **Skip affordance is hidden** — the "skip if none" text for dietary is good but `Continue` button always works. Make the skip more prominent for non-restricted users to reduce friction.
3. **GLP-1 user gap** — `GOAL_OPTIONS` has no GLP-1 option. This is a fast-growing segment (Ozempic/Wegovy users in 2025-2026). They need: high protein, low calories, small portions, anti-nausea foods. Adding `{ value: "glp1_support", label: "GLP-1 / Ozempic Support" }` would tap a high-intent audience. The AGENTS.md notes this gap explicitly.
4. **Social proof on step 1** — add "Join 12,000+ users finding dishes that fit their goals" below the FoodClaw title. Reduces anxiety about sharing email.
5. **Cuisine step order** — preferred cuisines on step 4 is good (lower priority). Consider making it collapsible (progressive disclosure) since most users won't have strong preferences.
6. **Animation between steps** — the step transition has no animation. A simple CSS slide-left/right on the card (200ms, `translate-x`) would feel much more native.

---

## 6. Macro Nutrition Display (`macro-bar.tsx`)

**Impact: MEDIUM | Risk: GREEN**

**Current state**: Segmented bar (protein/carbs/fat), labeled breakdown, highlight support for goal-focused sorting.

**Research findings (fitness apps 2025)**:
1. **Range display is missing from the bar** — macros are stored as min/max ranges but `avg()` collapses them to a single number. Consider adding a subtle range indicator: `"30-45g protein"` instead of just `"37p"`. Users making dietary decisions need to know uncertainty.
2. **"Nudges not judgments"** — the highlight pattern (brighter segment when `highlight === "protein"`) is correct. Don't add negative signals for bad macros; only positive highlights.
3. **Wearable integration context** — future feature: if user has logged their daily macros via Apple Health API, show a "fills 40% of your daily protein goal" micro-label. Not for now, but architecture note.
4. **The `role="img"` + `aria-label` on the bar** is correct WCAG practice. The label format `"Macros: X calories, Xg protein..."` is good. Consider adding units more explicitly: "37 grams protein" vs "37p" for screen readers.

---

## 7. Accessibility — WCAG 2.2 Compliance Audit

**Impact: HIGH | Risk: YELLOW | Target files: multiple**

### New WCAG 2.2 Requirements (Level AA)

1. **2.5.8 Target Size Minimum (24×24px)** — Most FoodClaw buttons appear compliant. Key concern: the `ConfidenceDot` tooltip trigger (`h-2.5 w-2.5` = 10×10px) is far below the 24×24px minimum. This needs a larger invisible hit area: `relative` wrapper + `absolute inset-0 -m-4` transparent pseudo-element, or change to `h-6 w-6` with `rounded-full`.
2. **2.4.11 Focus Not Obscured** — The sticky header in `page.tsx` (`sticky top-0 z-50`) could obscure focused elements beneath it when keyboard navigating. Test with Tab key on the dish grid.
3. **3.3.7 Redundant Entry** — Onboarding step 1 asks for name/email/password. If user goes back from step 2, the data must be preserved (it is, via state).
4. **2.5.7 Dragging Movements** — The `Slider` components in onboarding need single-pointer alternatives. The shadcn Slider uses keyboard arrows, which satisfies this.

### Existing Wins (Keep These)
- Skip-to-main-content link in `layout.tsx` — correct
- ARIA combobox on search typeahead — correct
- `aria-label` on heart favorite button — correct
- `role="listbox"` / `role="option"` on suggestions — correct
- `aria-pressed` on sort buttons — correct
- `aria-label` on macro bars — correct

### Gaps
- `ConfidenceDot` touch target too small (10×10px vs 24×24px minimum)
- Filter drawer allergen buttons: at `py-2` they're ~32px height — acceptable but worth upgrading to `py-2.5`
- Dark mode food photography: images that look balanced in light mode can feel too bright on dark. Consider subtle `dark:brightness-90` on `next/image` components.

---

## 8. Dark Mode for Food Photography

**Impact: MEDIUM | Risk: GREEN | Target files: `dish-card.tsx`**

Research confirms food delivery apps have historically avoided dark mode because food photography looks worse on dark backgrounds (too vivid, pulls focus). Key findings:

1. **Current implementation**: `dark:from-amber-900/20 dark:to-orange-900/10` gradient fallback is good — it uses low-saturation warm tones that feel natural in dark mode.
2. **Photo container in dark mode**: The gradient overlay `bg-gradient-to-t from-black/50` works for light mode. For dark mode, consider `dark:from-black/70` — darker scrim integrates photo better with dark background.
3. **Base colors**: Confirm `globals.css` uses `#121212` or `#1E1E1E` (not `#000000`) for dark backgrounds. Pure black causes eye fatigue.
4. **Accent colors in dark mode**: The primary green (`ns-green` / `#22c55e`) should remain consistent — green reads well on dark. Check that saturated accent colors aren't overused.
5. **Image `minimumCacheTTL`**: Next.js 16 changed default from 60s to 4 hours. This reduces re-optimization cost for food photos — good for FoodClaw's photo-heavy experience.

---

## 9. Progressive Disclosure — Gaps in Current UI

**Impact: MEDIUM | Risk: GREEN**

NN/G principle: max 2 levels of disclosure. Show only what users frequently need upfront. FoodClaw's current disclosure structure:

**Level 1 (always visible)**: dish name, restaurant, photo, calorie count, macro bar, distance, wait time, rating
**Level 2 (on dish detail page)**: full macro breakdown, ingredient list, reviews, dietary flags, delivery platforms

**Gaps**:
1. **Macro range is hidden** — avg() collapses min/max. A simple `30-45g` range is useful info that should be in Level 1, not just the detail page.
2. **Dietary flag badges** — the dish card shows warnings but not positive badges (e.g., a "GF" or "V" pill for confirmed gluten-free/vegan). A small pill showing the first 2 confirmed dietary flags (when `confidence >= 0.85`) would help allergen Alice scan quickly without opening the detail page.
3. **Macro source transparency** — `macro_source` is available in `DishCardData` but only shown via the `ConfidenceDot` tooltip. Consider showing it as a tiny label under the bar: "AI estimate" vs "Verified" to set correct expectations.

---

## 10. Skeleton Loading States

**Impact: LOW | Risk: GREEN | Target file: `page.tsx`**

**Current state**: Custom `skeleton-shimmer` CSS class for loading states. Layout matches final content (card with aspect ratio, title, bar). This is correct.

**Best practices for 2025**:
1. **300ms rule**: FoodClaw already shows skeletons on initial load. Confirm the state shows within 300ms of any navigation or filter change.
2. **Cross-fade from skeleton to content**: The current implementation likely does a hard swap. A `transition-opacity duration-300` on the content grid appearing would make it smoother.
3. **"Load more" spinner**: The inline spinner (`w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin`) at the sentinel is correct. Shows position-appropriate feedback without replacing content.

---

## 11. React Server Components Streaming Patterns

**Impact: HIGH | Risk: YELLOW | Target files: all pages**

**Current state**: `page.tsx` is `"use client"` and does all data fetching via `useEffect`. This means:
- Full client bundle sent before any data renders
- No streaming — user sees skeleton until all data resolves
- No PPR/Cache Components benefit

**Recommended pattern for Next.js 16**:
```tsx
// page.tsx — convert to Server Component
export default async function HomePage() {
  // Server-side: fetch initial data with "use cache"
  // Pass to client shell with just the interactive parts
}

// DishGrid.tsx — "use client" only for interactivity
"use client"
export function DishGrid({ initialDishes }) { ... }
```

**Migration path** (YELLOW risk — significant refactor):
1. Move geolocation to a client component `<GeoProvider>`
2. Convert `page.tsx` to a Server Component that reads `searchParams` for initial state
3. Wrap slow data fetches in `<Suspense>` with skeleton fallbacks
4. Keep `DishCard`, `FilterDrawer`, `SearchTypeahead` as client components (they need interactivity)
5. This is the "stream early, hydrate late" pattern — static header/shell instant, dish grid streams in

**Key insight**: The `pushState`-based filtering (changing search without navigation) is incompatible with pure RSC. FoodClaw's current architecture (all client, useEffect-driven) is actually a deliberate choice for the real-time filter UX. The right compromise is **hybrid**: Server Component for initial page shell + initial dish data, Client Component island for the interactive search/filter experience.

---

## 12. Micro-Animations — What FoodClaw Has vs Needs

**Impact: LOW-MEDIUM | Risk: GREEN**

**Current animations** (good):
- Card hover: `group-hover:-translate-y-1 group-hover:shadow-xl` — 300ms ✓
- Photo reveal: `opacity-0 → data-[loaded=true]:opacity-100 duration-500` ✓
- Photo hover zoom: `group-hover:scale-105 duration-500` ✓
- Macro bar segments: `transition-all duration-500` on width changes ✓
- Favorite heart: `hover:scale-110 active:scale-95 duration-200` ✓
- Filter pills: `scale-[1.02]` when active ✓

**Missing animations** (high ROI):
1. **Step transitions in onboarding** — no animation between steps 1-4. A `translate-x` slide is 10 lines of CSS.
2. **Heart favorite: no celebration** — toggling to favorited should have a brief `scale-125 → scale-100` pulse. 300ms. High delight for low cost.
3. **Add-to-cart equivalent** — FoodClaw has no "add" action, but the favorite toggle is the closest analog. Currently it just changes color. Adding a brief particle or ripple would follow the "90% positive brand perception" pattern from micro-animation research.
4. **Filter drawer open animation** — The Sheet component likely already has a slide-up animation from shadcn. Verify it's using `duration-300` not the default faster timing.
5. **Sort button transitions** — switching sort options could use a brief highlight flash on the results section title.

**Timing standards from research**:
- Standard interactions: 200-500ms
- Hover effects: 200ms
- Button feedback: 300-500ms
- Toast/notification entrance: 300-500ms, auto-hide after 2.5s

---

## 13. Haptic Feedback (iOS PWA)

**Impact: LOW | Risk: GREEN | Target files: `dish-card.tsx`, `filter-drawer.tsx`**

FoodClaw is a PWA (`manifest.json` registered). Current haptics: none.

**Research findings**:
- Android: Web Vibration API works via `navigator.vibrate()`
- iOS Safari: Vibration API NOT supported. Workaround: programmatic `click()` on a checkbox `type="switch"` triggers haptic in Safari 17.4+ (iOS 18+)
- npm package `web-haptics` provides unified API with React hook `useWebHaptics()`
- Case study: 27% increase in form completion rates from haptics on CTAs

**Recommended implementation**:
```ts
// Light haptic on: dish card tap, filter toggle, favorite heart
// Medium haptic on: filter apply, search submit
import { useWebHaptics } from 'web-haptics'
const { trigger, isSupported } = useWebHaptics()
// Call trigger('light') on key interactions
```

**Priority**: Low — nice-to-have for PWA feel. The `isSupported` guard means zero cost when not supported.

---

## 14. GLP-1 / Ozempic User Segment

**Impact: HIGH | Risk: GREEN | Target files: `onboarding/page.tsx`, `src/types/index.ts`**

**Market context**: GLP-1 medications (Ozempic, Wegovy, Mounjaro) are used by 15M+ Americans as of 2025. This is a high-intent food discovery audience with specific needs.

**GLP-1 user UX requirements**:
1. **Small portions / low calorie** — 300-500 cal per meal typical
2. **High protein** — need to preserve muscle mass during weight loss
3. **Anti-nausea foods** — avoid greasy, fried, heavy dishes
4. **Soft textures** — nausea from GI side effects
5. **Hydration reminders** — not UI, but the profile model could track this

**FoodClaw implementation path**:
1. Add `"glp1_support"` to `NutritionalGoals.priority` union in `src/types/index.ts`
2. In onboarding `GOAL_OPTIONS`: `{ value: "glp1_support", label: "GLP-1 Support (Ozempic, Wegovy)" }`
3. Orchestrator mapping: when `goal === "glp1_support"`, sort by `min_calories` AND add implicit filter for `calories_max < 600` AND deprioritize dishes with `fryer`/`deep-fried` in description
4. UI: show a subtle `💉 GLP-1 Friendly` badge on dishes under 500 cal with low fat
5. This is a GREEN-tier change: additive, no existing behavior breaks

---

## 15. Trust Signals for Allergy Safety UI

**Impact: HIGH (safety) | Risk: GREEN | Target files: `dish-card.tsx`, `confidence-dot.tsx`**

**Research**: Color-coded menus are the gold standard for allergy UX. Users with allergies make decisions on visual scan speed — they need immediate positive and negative signals.

**Current state**:
- `ConfidenceDot` shows macro confidence only, not dietary confidence
- Warning appears for uncertain dishes (`dish.warnings`)
- No positive "safe" badge for high-confidence cleared dishes

**Recommended additions to `DishCardData` (LOW risk)**:
1. **Dietary flag badges on card** — when a user has `nut_free` filter active AND the dish has `confidence >= 0.85` AND `nut_free === true`, show a small green "NF" pill on the card. Not just absence of warning.
2. **Red border highlight** for dishes with warnings when user has allergen filters active — visual scan efficiency.
3. **Tooltip upgrade on `ConfidenceDot`** — currently shows macro confidence. Could show dietary safety confidence separately for users with allergen filters.

**Safety note for AGENTS.md**: The evaluator correctly gates allergy-critical dishes at 85% (0.85) confidence minimum. The UI should visually represent this threshold so users understand the system's reasoning.

---

## Summary: Priority Action Items

### RED (Breaking — Must Fix)
1. Rename `src/middleware.ts` → `src/proxy.ts`, rename export to `proxy`
2. Audit all dynamic route pages for `params`/`searchParams` — add `await` prefix
3. Audit all API routes for `cookies()` / `headers()` — add `await` prefix
4. Update `revalidateTag()` calls to include cacheLife profile: `revalidateTag(tag, 'max')`
5. Confirm `experimental.ppr` is removed from `next.config.ts` (it is not present currently — OK)

### YELLOW (Improvement — Significant Impact)
6. Enable React Compiler: add `reactCompiler: true` to `next.config.ts` + install `babel-plugin-react-compiler@latest`
7. Add `"use cache"` directive to search API / orchestrator for explicit caching (replaces implicit behavior)
8. Add GLP-1 goal option to onboarding + types + orchestrator mapping
9. Fix `ConfidenceDot` touch target (10×10px → minimum 24×24px via invisible hit area)
10. Add dietary safety positive badges to `DishCard` for users with allergen filters active

### GREEN (Polish — Low Risk, High Delight)
11. Add query text highlighting in typeahead suggestions
12. Add recent searches to typeahead when focused with empty value
13. Add drag handle to filter drawer SheetContent
14. Add allergy safety copy to filter drawer allergen section
15. Add onboarding step slide animations (translate-x 200ms)
16. Add favorite heart celebration pulse animation (scale-125 → scale-100)
17. Add `web-haptics` for PWA tactile feedback
18. Add `dark:brightness-90` to food photos in dish cards for better dark mode integration
19. Show macro range (`30-45g`) in addition to avg on dish cards
20. Add "Low Calorie" carousel section alongside existing "Top Rated" and "High Protein" on home page

---

## Patterns Worth Adding to AGENTS.md

- Next.js 16: `middleware.ts` deprecated → rename to `proxy.ts`, export named `proxy`
- Next.js 16: `params` and `searchParams` in page components must be awaited (async)
- Next.js 16: `cookies()` and `headers()` in API routes must be awaited
- Next.js 16: `revalidateTag()` requires second `cacheLife` arg — use `'max'` for SWR semantics
- Next.js 16: `experimental.dynamicIO` renamed to `cacheComponents`
- React Compiler 1.0 stable: `reactCompiler: true` in next.config.ts auto-memoizes; `useCallback`/`useMemo` become redundant
- React 19.2: View Transitions API available for page-transition animations
- React 19.2: `<Activity>` component for off-screen UI pre-rendering while preserving state
- `ConfidenceDot` touch target is 10×10px — below WCAG 2.2 minimum 24×24px — needs invisible hit area wrapper
- GLP-1 goal option not yet in `NutritionalGoals.priority` — high-demand user segment to add
- `DishCardData.warnings` field IS present and IS mapped in `page.tsx` — AGENTS.md note about this gap is outdated
