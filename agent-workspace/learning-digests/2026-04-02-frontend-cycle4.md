# Frontend Learning Digest -- Cycle 4
**Date:** 2026-04-02
**Agent:** NutriScout Frontend Learning Agent
**Scope:** WCAG 2.2 gaps, Image optimization, skeleton loading, error boundaries, empty states
**Constraint:** Quick wins only (GREEN). RSC refactoring deferred.

---

## Codebase Snapshot

| File | Lines | Key Observation |
|------|-------|-----------------|
| `src/app/page.tsx` | 533 | All client-side; no error boundary around fetch; empty state exists but no retry CTA |
| `src/app/dish/[id]/page.tsx` | 497 | Has error.tsx boundary; photo carousel missing keyboard nav; good skeleton |
| `src/components/dish-card.tsx` | 195 | Image `sizes` too broad (`100vw` at mobile); no `loading="lazy"` needed (next/image defaults) |
| `src/components/category-pills.tsx` | 136 | Missing `role="tablist"`/`aria-pressed`; no focus-visible ring on pill buttons |
| `src/components/search-typeahead.tsx` | 214 | Good ARIA combobox pattern already; listbox roles correct |
| `src/components/macro-bar.tsx` | 81 | No `aria-label` on segmented bar; screen readers see nothing |
| `src/app/globals.css` | 242 | Has `:focus-visible` base style and `prefers-reduced-motion`; custom skeleton shimmer |
| `src/app/error.tsx` | 28 | Global error boundary exists; minimal but functional |
| `src/app/dish/[id]/error.tsx` | 31 | Dish-level error boundary with retry + back link |

## Backlog Items Relevant to Frontend

| Severity | Issue | Frontend Impact |
|----------|-------|-----------------|
| MINOR | No safety disclaimer in filter drawer for allergy users | `src/components/filter-drawer.tsx` -- needs an a11y-aware warning banner |
| MINOR | photo_count: 0 but photos array has 1 entry | Dish detail photo carousel trusts `photos.length` (correct), so no visual bug |

Most CRITICAL/MAJOR backlog items target `src/lib/orchestrator/` and `src/lib/evaluator/` (backend). No frontend-specific CRITICAL items open.

---

## Top 5 GREEN Quick Wins

### 1. Add `aria-pressed` and focus ring to category pill buttons
**File:** `src/components/category-pills.tsx`, lines 87-109
**Problem:** Category pill `<button>` elements have no `aria-pressed` attribute and no visible `:focus-visible` ring. Keyboard users cannot tell which categories are selected, violating WCAG 2.2 SC 1.4.11 (non-text contrast) and SC 4.1.2 (name/role/value).
**Fix:** Add `aria-pressed={isSelected}` to each button (line 87). Add `focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2` to the outer button class (line 94). The inner `<div>` already has visual selected state via `ring-2 ring-primary/20`, but the `<button>` itself needs the focus indicator.

```tsx
// line 87 -- add aria-pressed
<button
  key={cat.id}
  aria-pressed={isSelected}
  onClick={...}
  className="flex flex-col items-center gap-1.5 shrink-0 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 rounded-2xl"
>
```

**Effort:** ~5 min. Zero risk.

---

### 2. Add `aria-label` to macro ratio bars in DishCard and MacroBar
**Files:**
- `src/components/dish-card.tsx`, lines 151-155 (inline macro bar)
- `src/components/macro-bar.tsx`, lines 27-31 (compact) and 48-61 (full)

**Problem:** The colored segmented `<div>` bars convey macro ratios visually but are invisible to screen readers. WCAG 2.2 SC 1.1.1 (non-text content).
**Fix:** Wrap each bar in a container with `role="img"` and a computed `aria-label`:

```tsx
// dish-card.tsx line 151
<div
  role="img"
  aria-label={`Macro ratio: ${pro}g protein, ${carb}g carbs, ${fat}g fat`}
  className="flex h-1 w-full overflow-hidden rounded-full bg-muted/60"
>
```

Apply the same pattern to `macro-bar.tsx` lines 27 and 48.

**Effort:** ~10 min. Zero risk.

---

### 3. Tighten `sizes` attribute on DishCard Image component
**File:** `src/components/dish-card.tsx`, line 85
**Current:** `sizes="(max-width: 640px) 100vw, 50vw"`
**Problem:** On mobile the card is never full viewport width -- it sits inside a `max-w-3xl` (768px) container with `px-4` padding and a 2-col grid above 400px. The current `sizes` causes the browser to download an image 2-3x larger than needed on mobile, hurting LCP on 3G/4G.
**Fix:**
```tsx
sizes="(max-width: 399px) calc(100vw - 32px), (max-width: 1024px) calc(50vw - 24px), 240px"
```

This tells the browser:
- Below 400px (1-col): full width minus padding
- 400px-1024px (2-col): half width minus gap
- Above 1024px (3-col inside 768px max): ~240px

**Effort:** ~5 min. Measurable LCP improvement on mobile.

---

### 4. Add inline error fallback for failed dish fetch on home page
**File:** `src/app/page.tsx`, lines 73-126 (`fetchDishes` callback)
**Problem:** If the `/api/search` fetch fails (network error, 500), the `catch` is swallowed by the empty `finally` block. The user sees the loading skeleton indefinitely or an empty grid with no explanation. The existing `error.tsx` boundary only catches render errors, not failed fetch-then-setState flows.
**Fix:** Add an `error` state and display an inline retry banner:

```tsx
// Add state at line 38 area
const [fetchError, setFetchError] = useState(false);

// In fetchDishes, after the try block (around line 123):
} catch {
  setFetchError(true);
} finally {
  setLoading(false);
}

// In DishesView, before the empty-state check (before line 379):
if (fetchError && dishes.length === 0) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <p className="text-base font-bold">Could not load dishes</p>
      <p className="text-sm text-muted-foreground mt-1.5">Check your connection and try again.</p>
      <Button variant="outline" className="mt-4" onClick={() => fetchDishes(search, filters)}>
        Retry
      </Button>
    </div>
  );
}
```

**Effort:** ~15 min. Prevents infinite-skeleton on network failure.

---

### 5. Add keyboard navigation to photo carousel dot indicators
**File:** `src/app/dish/[id]/page.tsx`, lines 202-217
**Problem:** Photo dot indicators are `<button>` elements but lack keyboard context. There is no `aria-current`, no grouping role, and the buttons only have `aria-label="Photo N"` with no indication of total or current. Keyboard users tabbing through dots get no feedback. WCAG 2.2 SC 2.4.7 (focus visible) and SC 4.1.2.
**Fix:** Wrap dots in a `<div role="tablist">`, switch dots to `role="tab"` with `aria-selected`, and add left/right arrow key navigation:

```tsx
<div role="tablist" aria-label="Photo carousel" className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
  {dish.photos.map((_, i) => (
    <button
      key={i}
      role="tab"
      aria-selected={i === photoIndex}
      aria-label={`Photo ${i + 1} of ${dish.photos.length}`}
      tabIndex={i === photoIndex ? 0 : -1}
      className={`rounded-full transition-all duration-200 focus-visible:ring-2 focus-visible:ring-white ${
        i === photoIndex ? "w-4 h-2 bg-white" : "w-2 h-2 bg-white/50"
      }`}
      onClick={() => { /* existing scroll logic */ }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") dish.photos[(i+1) % dish.photos.length] && setPhotoIndex((i+1) % dish.photos.length);
        if (e.key === "ArrowLeft") setPhotoIndex(i > 0 ? i - 1 : dish.photos.length - 1);
      }}
    />
  ))}
</div>
```

**Effort:** ~15 min. Completes keyboard accessibility for the carousel.

---

## Research Notes (kept brief)

**WCAG 2.2 (2023, still current standard):**
- SC 2.4.13 "Focus Appearance" (new in 2.2, AAA) recommends focus indicators with minimum 2px outline and 3:1 contrast. Our globals.css `:focus-visible` rule uses `outline-2 outline-primary/50` which meets AA but not the stricter AAA due to the 50% opacity. Quick upgrade: change to `outline-primary/70` in globals.css line 162.
- SC 3.2.6 "Consistent Help" (new in 2.2, A) -- not relevant here yet (no help mechanism).

**Next.js Image (v15, current):**
- The `sizes` prop is the single biggest lever for reducing image download size. The `fill` layout without accurate `sizes` defaults to requesting the largest srcset candidate.
- `priority` is already correctly set only on first photo in dish detail (line 196). DishCard images in the grid should NOT have priority (correct as-is).

**Skeleton Loading:**
- The custom `skeleton-shimmer` class in globals.css is well-implemented with `prefers-reduced-motion` support. Both the home page grid skeleton (page.tsx lines 343-376) and dish detail skeleton (dish/[id]/page.tsx lines 126-133) are present. No gaps here.

**Error Boundaries:**
- Both `src/app/error.tsx` and `src/app/dish/[id]/error.tsx` exist and are functional. The gap is client-side fetch errors in the home page which bypass error boundaries entirely (see GREEN item 4 above).

**Empty States:**
- Home page has good empty states for both dishes (line 379-390) and restaurants (line 501-512). The dish detail 404 state (line 136-143) is minimal but adequate. No action needed.

---

## Deferred (NOT in scope this cycle)

- RSC refactoring of `page.tsx` (would require extracting search state to URL params)
- Image blur placeholder data URLs (requires build-time image processing pipeline)
- Virtualized list for infinite scroll (only needed at 100+ cards)
- i18n / RTL support
