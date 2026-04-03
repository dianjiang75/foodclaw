# FoodClaw Deep UI/UX Design System

> Comprehensive, implementation-ready design system for a dish-first food discovery app.
> Tech stack: Next.js 16 App Router, TypeScript, Tailwind CSS v4, shadcn/ui v4, Framer Motion.

---

## Table of Contents

1. [Design Philosophy & Competitive Analysis](#1-design-philosophy--competitive-analysis)
2. [Color System](#2-color-system)
3. [Typography](#3-typography)
4. [Spacing & Layout Grid](#4-spacing--layout-grid)
5. [Component Library — shadcn/ui Customizations](#5-component-library--shadcnui-customizations)
6. [Dish Card Design Patterns](#6-dish-card-design-patterns)
7. [Dark Mode System](#7-dark-mode-system)
8. [Micro-interactions & Animations](#8-micro-interactions--animations)
9. [Accessibility & WCAG Compliance](#9-accessibility--wcag-compliance)
10. [Dietary Label System](#10-dietary-label-system)
11. [Macro Visualization System](#11-macro-visualization-system)
12. [Navigation & Information Architecture](#12-navigation--information-architecture)
13. [Implementation Roadmap](#13-implementation-roadmap)

---

## 1. Design Philosophy & Competitive Analysis

### What top nutrition/food apps do right

**MyFitnessPal (2025 redesign)**
- Clean data-dense layouts with progressive disclosure; macro rings use blue (#0073E6), green (#22C55E), orange (#F59E0B), red (#EF4444) — consistent worldwide standard for protein/carbs/fat/calories
- Card-based food logging with 48px touch targets
- Extremely dense nutritional info without feeling cluttered (uses 12px/14px type with 500 weight for numbers)

**Lifesum**
- Premium "wellness aesthetic" — soft pastels, generous whitespace, rounded corners (16px radius)
- Gradient backgrounds on macro rings (not flat colors)
- Photo-centric food cards with 3:2 aspect ratio
- Serif + sans-serif pairing (DM Serif Display + Inter)

**Noom**
- Color-coded food classification system (green/yellow/red) — FoodClaw's confidence system mirrors this
- Heavy use of illustrations and iconography to reduce cognitive load
- Bottom sheet patterns for filters rather than full-page navigation
- Typography: 700 weight headers, generous letter-spacing on labels

**Yuka (food scanner)**
- Traffic-light scoring: green circle = good, orange = mediocre, red = bad
- Extremely simple card layouts — one metric dominates (the score)
- Sans-serif only (Circular/Avenir style), very clean

**Fitia**
- Macro-first design: protein/carbs/fat shown as horizontal segmented bars (FoodClaw already does this)
- Dark mode default, health data on dark backgrounds reads as "premium"
- Color-coded macros: Protein = blue-purple, Carbs = warm yellow, Fat = coral-pink

**SnapCalorie**
- AI photo analysis UX: camera viewfinder with overlay guides, animated scanning effect
- Results appear as an overlay card sliding up from bottom
- Confidence displayed as a subtle progress ring around the food photo

### Key design principles for FoodClaw

1. **Data density without overwhelm** — show macros at a glance, details on demand
2. **Traffic-light patterns** — green/amber/red for confidence, wait times, dietary compliance
3. **Photo-forward** — food photos are the hook; macros are the substance
4. **Mobile-first, thumb-zone aware** — primary actions in bottom 40% of screen
5. **Trust through transparency** — always show confidence levels and data sources

---

## 2. Color System

### Primary Palette

The current FoodClaw palette uses OKLCH (good for perceptual uniformity). Below are the recommended values with hex equivalents for reference.

#### Brand Colors

| Token | OKLCH | Approx Hex | Usage |
|-------|-------|------------|-------|
| `--ns-primary` | `oklch(0.55 0.18 155)` | `#16A34A` | Brand green, CTAs, positive states |
| `--ns-primary-light` | `oklch(0.92 0.04 155)` | `#DCFCE7` | Green tint backgrounds |
| `--ns-primary-dark` | `oklch(0.40 0.14 155)` | `#15803D` | Hover/active state |

#### Semantic Colors

| Token | OKLCH | Approx Hex | Usage |
|-------|-------|------------|-------|
| `--ns-green` | `oklch(0.55 0.15 150)` | `#22C55E` | High confidence, compliant, short wait |
| `--ns-green-light` | `oklch(0.92 0.05 150)` | `#D1FAE5` | Green tag backgrounds |
| `--ns-amber` | `oklch(0.75 0.15 75)` | `#F59E0B` | Moderate confidence, medium wait |
| `--ns-amber-light` | `oklch(0.93 0.05 75)` | `#FEF3C7` | Amber tag backgrounds |
| `--ns-red` | `oklch(0.55 0.2 25)` | `#DC2626` | Low confidence, long wait, allergen warning |
| `--ns-red-light` | `oklch(0.92 0.05 25)` | `#FEE2E2` | Red tag backgrounds |

#### Macro Colors (consistent with fitness app conventions)

| Token | OKLCH | Approx Hex | Usage |
|-------|-------|------------|-------|
| `--ns-protein` | `oklch(0.55 0.20 265)` | `#6366F1` | Protein — indigo/blue-violet |
| `--ns-carbs` | `oklch(0.72 0.16 65)` | `#EAB308` | Carbs — warm gold |
| `--ns-fat` | `oklch(0.65 0.18 25)` | `#F97316` | Fat — coral/orange |
| `--ns-calories` | `oklch(0.55 0.00 0)` | `#737373` | Calories — neutral gray |

> **Rationale for protein = indigo:** MyFitnessPal, Fitia, and MacroFactor all use blue-purple for protein. It's the most widely recognized convention. The current `oklch(0.55 0.15 250)` is close — shift to 265 hue for stronger distinction from carbs.

#### Chart Colors (for macro breakdowns, trends)

| Token | Approx Hex | Usage |
|-------|------------|-------|
| `--chart-1` | `#6366F1` | Protein (matches macro) |
| `--chart-2` | `#EAB308` | Carbs |
| `--chart-3` | `#F97316` | Fat |
| `--chart-4` | `#22C55E` | Fiber / micronutrient |
| `--chart-5` | `#06B6D4` | Water / hydration |

#### Background & Surface Colors

```css
/* Light mode */
:root {
  --background: oklch(0.985 0.002 110);    /* Warm white #FAFAF5 — NOT pure white */
  --card: oklch(1.0 0 0);                   /* True white for cards */
  --card-elevated: oklch(1.0 0 0);           /* Same, use shadow for elevation */
  --muted: oklch(0.965 0.002 110);           /* Warm gray #F5F5F0 */
  --border: oklch(0.90 0.005 110);           /* Subtle warm border #E5E5DF */
}

/* Dark mode */
.dark {
  --background: oklch(0.13 0.005 260);       /* Deep blue-black #111118 */
  --card: oklch(0.18 0.005 260);             /* Elevated surface #1C1C28 */
  --card-elevated: oklch(0.22 0.005 260);    /* Higher elevation #252535 */
  --muted: oklch(0.25 0.005 260);            /* Muted surface #2A2A3C */
  --border: oklch(0.28 0.005 260);           /* Subtle border #333345 */
}
```

> **Why warm white, not pure white?** Food photography looks more appetizing against slightly warm backgrounds. Pure white (#FFF) creates harsh contrast with food photos. A barely-perceptible warm tint (#FAFAF5) makes the entire app feel more inviting — Lifesum and DoorDash both use this technique.

### Full CSS Variables Block (replacement for globals.css)

```css
:root {
  /* Surfaces */
  --background: oklch(0.985 0.002 110);
  --foreground: oklch(0.145 0.005 260);
  --card: oklch(1.0 0 0);
  --card-foreground: oklch(0.145 0.005 260);
  --popover: oklch(1.0 0 0);
  --popover-foreground: oklch(0.145 0.005 260);

  /* Brand */
  --primary: oklch(0.55 0.18 155);
  --primary-foreground: oklch(0.99 0 0);
  --secondary: oklch(0.965 0.002 110);
  --secondary-foreground: oklch(0.25 0.005 260);
  --accent: oklch(0.965 0.005 155);
  --accent-foreground: oklch(0.35 0.14 155);

  /* Utility */
  --muted: oklch(0.965 0.002 110);
  --muted-foreground: oklch(0.50 0.005 260);
  --destructive: oklch(0.55 0.22 25);
  --border: oklch(0.90 0.005 110);
  --input: oklch(0.90 0.005 110);
  --ring: oklch(0.55 0.18 155);

  /* FoodClaw semantic */
  --ns-green: oklch(0.55 0.15 150);
  --ns-green-light: oklch(0.92 0.05 150);
  --ns-amber: oklch(0.75 0.15 75);
  --ns-amber-light: oklch(0.93 0.05 75);
  --ns-red: oklch(0.55 0.2 25);
  --ns-red-light: oklch(0.92 0.05 25);
  --ns-protein: oklch(0.55 0.20 265);
  --ns-carbs: oklch(0.72 0.16 65);
  --ns-fat: oklch(0.65 0.18 25);
  --ns-calories: oklch(0.55 0 0);

  --radius: 0.625rem; /* 10px — good for cards, inputs */
}
```

---

## 3. Typography

### Font Stack

**Current:** Geist Sans + Geist Mono (solid choice — geometric, clean, excellent for data)

**Recommended upgrade:** Keep Geist Sans as the primary. Add a display/heading font for the brand name and major headings.

| Role | Font | Weight | Fallback |
|------|------|--------|----------|
| Body / UI | Geist Sans | 400, 500, 600 | `system-ui, -apple-system, sans-serif` |
| Headings | Geist Sans | 600, 700 | Same |
| Mono / Data | Geist Mono | 400, 500 | `ui-monospace, monospace` |
| Brand wordmark | Geist Sans | 800 | - |

> **Why NOT add a display font:** Geist Sans is purpose-built for interfaces. Adding DM Serif or Playfair adds visual noise without helping FoodClaw's data-heavy screens. Lifesum can afford serif headings because it's a lifestyle brand — FoodClaw is a tool. Keep it utilitarian.

### Type Scale (Mobile-first)

Use a modular scale based on `1rem = 16px` with a ratio of 1.2 (minor third).

| Token | Size | Line Height | Weight | Usage |
|-------|------|-------------|--------|-------|
| `text-xs` | 12px / 0.75rem | 16px / 1.33 | 400-500 | Metadata, captions, macro labels |
| `text-sm` | 14px / 0.875rem | 20px / 1.43 | 400-500 | Body text, descriptions, filter chips |
| `text-base` | 16px / 1rem | 24px / 1.5 | 400 | Default body |
| `text-lg` | 18px / 1.125rem | 28px / 1.56 | 600 | Section headers, dish name on detail |
| `text-xl` | 20px / 1.25rem | 28px / 1.4 | 700 | Page titles |
| `text-2xl` | 24px / 1.5rem | 32px / 1.33 | 700 | Hero/feature titles |
| `text-3xl` | 30px / 1.875rem | 36px / 1.2 | 800 | Landing page hero |

### Special number formatting

For macro values and nutritional data, use **tabular numbers** and **medium weight**:

```tsx
// Tailwind class for numeric data
className="font-mono text-sm font-medium tabular-nums"

// CSS custom property
.macro-value {
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum";
}
```

This ensures columns of numbers align properly in macro breakdowns.

### Letter spacing

| Context | Letter spacing |
|---------|---------------|
| Body text | `tracking-normal` (0) |
| All-caps labels (e.g., "PROTEIN") | `tracking-wider` (0.05em) |
| Large headings (2xl+) | `tracking-tight` (-0.025em) |

---

## 4. Spacing & Layout Grid

### Spacing Scale

Tailwind's default scale is fine. Key spacing values for FoodClaw:

| Use Case | Tailwind | Pixels |
|----------|----------|--------|
| Inline element gap (icon + text) | `gap-1` / `gap-1.5` | 4-6px |
| Between related items (badge row) | `gap-2` | 8px |
| Card internal padding | `p-3` / `p-4` | 12-16px |
| Between cards in grid | `gap-4` | 16px |
| Section spacing | `space-y-6` | 24px |
| Page horizontal padding | `px-4` (mobile), `px-6` (tablet) | 16-24px |
| Max content width | `max-w-2xl` (672px) / `max-w-4xl` (896px) | - |

### Layout Grid

```
Mobile (< 640px):
  Single column, full-width cards
  Max width: 100% with 16px horizontal padding
  Cards: full-bleed photos, 12px internal padding

Tablet (640px-1024px):
  2-column grid for dish cards
  Max width: 672px (max-w-2xl) centered
  Gap: 16px

Desktop (1024px+):
  2-column grid for cards, 3-column for discovery
  Max width: 896px (max-w-4xl) centered
  Sidebar possible for filters (280px fixed)
```

### Touch Targets

Per WCAG 2.5.8 and Apple HIG:

| Element | Minimum size | Recommended |
|---------|--------------|-------------|
| Buttons | 44x44px | 48x48px |
| Filter chips/badges | 32px height | 36px height |
| Icon buttons | 44x44px | 40px icon in 48px target |
| List items | 48px height | 56px height |

> **Current issue:** Filter badges in `page.tsx` use `text-xs` without explicit height. Add `h-8` (32px) minimum with `py-1.5 px-3` padding.

---

## 5. Component Library — shadcn/ui Customizations

### Currently installed shadcn components

Already in project: `button`, `badge`, `card`, `input`, `label`, `slider`, `tabs`, `skeleton`, `separator`, `tooltip`

### Components to add

```bash
npx shadcn@latest add sheet           # Bottom sheet for mobile filters
npx shadcn@latest add dialog          # Photo viewer, AI scan results
npx shadcn@latest add dropdown-menu   # Sort options, overflow menus
npx shadcn@latest add select          # Goal picker, cuisine filter
npx shadcn@latest add toggle-group    # Diet filter chips (replace manual badges)
npx shadcn@latest add progress        # Macro progress bars, upload progress
npx shadcn@latest add avatar          # User profile, restaurant logos
npx shadcn@latest add scroll-area     # Horizontal scroll for filter rows
npx shadcn@latest add command         # Search palette (Cmd+K dish search)
npx shadcn@latest add drawer          # Mobile bottom drawer pattern
npx shadcn@latest add carousel        # Photo gallery on dish detail
npx shadcn@latest add chart           # Recharts-based macro visualization
```

### Component Customizations

#### Button variants for FoodClaw

```tsx
// In button.tsx, add these variants to the CVA config:
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        destructive: "bg-destructive text-white shadow-xs hover:bg-destructive/90",
        outline: "border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // FoodClaw additions:
        "ns-green": "bg-ns-green text-white hover:bg-ns-green/90",
        "ns-filter": "border border-border rounded-full hover:bg-muted text-sm h-8",
        "ns-filter-active": "bg-foreground text-background border-foreground rounded-full text-sm h-8",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-6",
        icon: "h-9 w-9",
        // FoodClaw additions:
        chip: "h-8 px-3 text-xs rounded-full",
      },
    },
  }
);
```

#### Badge variants for dietary tags

```tsx
// In badge.tsx, add dietary-specific variants:
const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground",
        // Dietary compliance badges
        "diet-compliant": "bg-ns-green-light text-ns-green border-ns-green/20",
        "diet-warning": "bg-ns-amber-light text-ns-amber border-ns-amber/20",
        "diet-danger": "bg-ns-red-light text-ns-red border-ns-red/20",
        // Macro highlight badges
        "macro-protein": "bg-ns-protein/10 text-ns-protein border-ns-protein/20",
        "macro-carbs": "bg-ns-carbs/10 text-ns-carbs border-ns-carbs/20",
        "macro-fat": "bg-ns-fat/10 text-ns-fat border-ns-fat/20",
        // Delivery platform badges
        "platform": "bg-muted text-muted-foreground border-border text-[10px] px-1.5 py-0",
      },
    },
  }
);
```

#### Card hover state enhancement

```tsx
// Enhance the Card component for dish cards
const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }>(
  ({ className, interactive = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border bg-card text-card-foreground shadow-sm",
        interactive && [
          "cursor-pointer transition-all duration-200",
          "hover:shadow-md hover:border-border/80",
          "hover:-translate-y-0.5",
          "active:translate-y-0 active:shadow-sm",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        ],
        className
      )}
      {...props}
    />
  )
);
```

---

## 6. Dish Card Design Patterns

### Anatomy of a dish card

Based on analysis of DoorDash, Uber Eats, Yelp, and fitness meal apps:

```
┌─────────────────────────────┐
│                             │
│    [Food Photo 16:10]       │  aspect-[16/10] or aspect-video
│                             │
│    [Confidence dot overlay] │  absolute top-right
│    [Delivery badges overlay]│  absolute bottom-left
│                             │
├─────────────────────────────┤
│ Dish Name              4.2★ │  font-semibold text-sm + rating
│ Restaurant Name · 0.3 mi    │  text-xs text-muted-foreground
│                             │
│ ██████████████████████████  │  Macro bar (protein|carbs|fat)
│ 450 cal · 38g P · 42g C    │  text-xs text-muted-foreground
│                             │
│ [~5 min] [UberEats] [DD]   │  WaitBadge + platform badges
└─────────────────────────────┘
```

### Recommended card dimensions

| Property | Mobile | Tablet+ |
|----------|--------|---------|
| Card width | 100% (single col) | calc(50% - 8px) |
| Photo aspect ratio | 16:10 (wider than 16:9) | 16:10 |
| Photo height | ~200px | ~180px |
| Content padding | 12px | 12px |
| Total card height | ~340px | ~320px |
| Border radius | 12px (`rounded-xl`) | 12px |
| Gap between cards | 16px | 16px |

### Photo aspect ratio recommendation

Change from `aspect-video` (16:9) to `aspect-[16/10]` (1.6:1). Rationale:
- 16:9 is too cinematic for food — food photos are usually more square
- 4:3 wastes vertical space in a feed
- 16:10 is the sweet spot used by DoorDash and Uber Eats

```tsx
// Replace aspect-video with:
<div className="aspect-[16/10] w-full bg-muted overflow-hidden relative">
```

### Information density levels

**Compact card (search results feed):**
- Photo + name + restaurant + macro bar + wait badge
- 5 data points visible at a glance

**Expanded card (detail view):**
- Full photo carousel + all macros with ranges + dietary flags + reviews
- Progressive disclosure via sections

**List view option (for data-focused users):**
```
┌──────┬──────────────────────────────────┐
│      │ Grilled Chicken Bowl    4.2★     │
│ 80px │ Sweetgreen · 0.3mi · ~5 min     │
│ thumb│ 450cal · 38g P · 42g C · 12g F  │
│      │ [vegan] [gluten-free]            │
└──────┴──────────────────────────────────┘
```

Implement as a toggle between grid and list view.

### Photo overlay pattern

```tsx
// Overlay for delivery badges and confidence on the photo
<div className="aspect-[16/10] w-full bg-muted overflow-hidden relative group">
  <img src={url} alt={name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />

  {/* Gradient overlay for text readability */}
  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

  {/* Confidence indicator — top right */}
  <div className="absolute top-2 right-2">
    <ConfidenceDot confidence={confidence} source={source} />
  </div>

  {/* Price — bottom right */}
  {price && (
    <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs font-medium px-2 py-0.5 rounded-full backdrop-blur-sm">
      ${price.toFixed(0)}
    </span>
  )}
</div>
```

---

## 7. Dark Mode System

### Implementation approach

Use `next-themes` for system-aware dark mode with manual toggle:

```bash
npm install next-themes
```

```tsx
// layout.tsx
import { ThemeProvider } from "next-themes";

<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
  {children}
</ThemeProvider>
```

### Dark mode color mapping

| Token | Light | Dark | Notes |
|-------|-------|------|-------|
| `--background` | `oklch(0.985 0.002 110)` | `oklch(0.13 0.005 260)` | Warm white to deep blue-black |
| `--card` | `oklch(1.0 0 0)` | `oklch(0.18 0.005 260)` | White to dark surface |
| `--foreground` | `oklch(0.145 0.005 260)` | `oklch(0.93 0 0)` | Near-black to near-white |
| `--muted` | `oklch(0.965 0.002 110)` | `oklch(0.22 0.005 260)` | - |
| `--muted-foreground` | `oklch(0.50 0.005 260)` | `oklch(0.65 0.005 260)` | - |
| `--border` | `oklch(0.90 0.005 110)` | `oklch(0.25 0.005 260)` | - |
| `--primary` | `oklch(0.55 0.18 155)` | `oklch(0.65 0.18 155)` | Lighten green for dark bg |
| `--ns-green` | `oklch(0.55 0.15 150)` | `oklch(0.65 0.15 150)` | Lighten for readability |
| `--ns-green-light` | `oklch(0.92 0.05 150)` | `oklch(0.25 0.08 150)` | Invert: light bg to dark bg |
| `--ns-amber` | `oklch(0.75 0.15 75)` | `oklch(0.78 0.15 75)` | Slightly brighter |
| `--ns-amber-light` | `oklch(0.93 0.05 75)` | `oklch(0.25 0.08 75)` | Invert |
| `--ns-red` | `oklch(0.55 0.2 25)` | `oklch(0.65 0.2 25)` | Lighten |
| `--ns-red-light` | `oklch(0.92 0.05 25)` | `oklch(0.25 0.08 25)` | Invert |

### Key dark mode principles

1. **Never invert macro colors** — protein should always be indigo, carbs gold, fat orange. Only adjust lightness for dark backgrounds (+10-15% lightness in OKLCH).

2. **Food photos need no adjustment** — they look naturally good on dark backgrounds. The contrast actually makes them pop more.

3. **Semantic tag backgrounds invert** — light tinted backgrounds (`bg-ns-green-light`) become dark tinted backgrounds. The text color also lightens.

4. **Borders become more subtle** — use `oklch(1 0 0 / 10%)` (10% white) borders in dark mode.

5. **Shadows disappear, borders appear** — dark mode cards use borders instead of shadows:
```css
.dark .card {
  box-shadow: none;
  border: 1px solid oklch(1 0 0 / 8%);
}
```

6. **AMOLED variant** (optional for mobile):
```css
@media (prefers-contrast: more) {
  .dark {
    --background: oklch(0 0 0);    /* True black */
    --card: oklch(0.10 0.005 260);
  }
}
```

### Dark mode toggle component

```tsx
"use client";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Monitor } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-1 rounded-full border p-1">
      <Button
        variant="ghost" size="icon"
        className={`h-7 w-7 rounded-full ${theme === "light" ? "bg-muted" : ""}`}
        onClick={() => setTheme("light")}
      >
        <Sun className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost" size="icon"
        className={`h-7 w-7 rounded-full ${theme === "system" ? "bg-muted" : ""}`}
        onClick={() => setTheme("system")}
      >
        <Monitor className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost" size="icon"
        className={`h-7 w-7 rounded-full ${theme === "dark" ? "bg-muted" : ""}`}
        onClick={() => setTheme("dark")}
      >
        <Moon className="h-4 w-4" />
      </Button>
    </div>
  );
}
```

---

## 8. Micro-interactions & Animations

### Library: Framer Motion

```bash
npm install framer-motion
```

Framer Motion is the standard for React/Next.js. It works with Tailwind and supports:
- Layout animations (card reordering when filters change)
- Presence animations (enter/exit)
- Gesture animations (drag, tap, hover)
- Scroll-triggered animations

### Animation tokens

Define consistent durations and easings:

```tsx
// lib/motion.ts
export const MOTION = {
  // Durations
  fast: 0.15,       // Micro-interactions (hover, press)
  normal: 0.25,     // Standard transitions
  slow: 0.4,        // Page transitions, modals
  spring: { type: "spring", stiffness: 300, damping: 30 },

  // Easings
  ease: [0.25, 0.1, 0.25, 1],
  easeIn: [0.42, 0, 1, 1],
  easeOut: [0, 0, 0.58, 1],
  easeInOut: [0.42, 0, 0.58, 1],

  // Common animation presets
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.25 },
  },
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
    transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] },
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: 0.2 },
  },
} as const;
```

### Dish card stagger animation

```tsx
// Staggered entrance for dish grid
import { motion } from "framer-motion";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] } },
};

// In the grid:
<motion.div
  className="grid gap-4 sm:grid-cols-2"
  variants={container}
  initial="hidden"
  animate="show"
>
  {dishes.map((dish) => (
    <motion.div key={dish.id} variants={item} layout>
      <DishCard dish={dish} />
    </motion.div>
  ))}
</motion.div>
```

### Skeleton loading states

The current skeleton is good. Enhance with shimmer animation:

```css
/* Add to globals.css */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton-shimmer {
  background: linear-gradient(
    90deg,
    oklch(0.92 0 0) 0%,
    oklch(0.96 0 0) 50%,
    oklch(0.92 0 0) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}

.dark .skeleton-shimmer {
  background: linear-gradient(
    90deg,
    oklch(0.22 0 0) 0%,
    oklch(0.28 0 0) 50%,
    oklch(0.22 0 0) 100%
  );
  background-size: 200% 100%;
}
```

### Macro bar animation

Animate macro bars filling up when they enter viewport:

```tsx
"use client";
import { motion } from "framer-motion";

export function AnimatedMacroBar({ protein, carbs, fat, total }: {
  protein: number; carbs: number; fat: number; total: number;
}) {
  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
      <motion.div
        className="bg-ns-protein"
        initial={{ width: 0 }}
        animate={{ width: `${(protein / total) * 100}%` }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1], delay: 0 }}
      />
      <motion.div
        className="bg-ns-carbs"
        initial={{ width: 0 }}
        animate={{ width: `${(carbs / total) * 100}%` }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1], delay: 0.1 }}
      />
      <motion.div
        className="bg-ns-fat"
        initial={{ width: 0 }}
        animate={{ width: `${(fat / total) * 100}%` }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1], delay: 0.2 }}
      />
    </div>
  );
}
```

### AI photo scan animation

For the AI macro estimation from food photos:

```tsx
export function ScanOverlay({ scanning }: { scanning: boolean }) {
  if (!scanning) return null;

  return (
    <motion.div
      className="absolute inset-0 z-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Scanning line */}
      <motion.div
        className="absolute left-0 right-0 h-0.5 bg-ns-green shadow-[0_0_8px_rgba(34,197,94,0.6)]"
        animate={{ top: ["0%", "100%", "0%"] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Corner brackets */}
      <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-ns-green rounded-tl" />
      <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-ns-green rounded-tr" />
      <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-ns-green rounded-bl" />
      <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-ns-green rounded-br" />

      {/* Label */}
      <motion.p
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-xs font-medium text-ns-green bg-black/60 px-3 py-1 rounded-full backdrop-blur-sm"
        animate={{ opacity: [1, 0.5, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        Analyzing nutrition...
      </motion.p>
    </motion.div>
  );
}
```

### Pull-to-refresh animation

```tsx
// Lightweight pull-to-refresh for mobile
<motion.div
  className="flex items-center justify-center py-4 text-muted-foreground"
  initial={{ height: 0, opacity: 0 }}
  animate={isRefreshing ? { height: 48, opacity: 1 } : { height: 0, opacity: 0 }}
>
  <motion.div
    animate={{ rotate: isRefreshing ? 360 : 0 }}
    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
  >
    <RefreshCw className="h-5 w-5" />
  </motion.div>
</motion.div>
```

### Filter chip toggle animation

```tsx
<motion.button
  layout
  whileTap={{ scale: 0.95 }}
  className={cn(
    "h-8 px-3 text-xs rounded-full border transition-colors",
    active ? "bg-ns-green text-white border-ns-green" : "border-border hover:bg-muted"
  )}
>
  <motion.span layout>{label}</motion.span>
</motion.button>
```

---

## 9. Accessibility & WCAG Compliance

### Color Contrast Requirements

All text must meet **WCAG 2.1 AA** minimum (AAA preferred for body text):

| Text type | Minimum contrast ratio | Standard |
|-----------|----------------------|----------|
| Normal text (< 18px) | 4.5:1 | AA |
| Large text (>= 18px bold or 24px) | 3:1 | AA |
| UI components, icons | 3:1 | AA |
| Body text (ideally) | 7:1 | AAA |

### Contrast audit of current FoodClaw colors

| Combination | Light mode ratio | Dark mode ratio | Pass? |
|-------------|-----------------|-----------------|-------|
| Foreground on Background | ~16:1 | ~14:1 | AA/AAA |
| Muted-foreground on Background | ~5.5:1 | ~5:1 | AA |
| ns-green on white | ~3.5:1 | - | FAIL for small text |
| ns-green on ns-green-light | ~4.2:1 | - | AA (barely) |
| ns-amber on white | ~2.5:1 | - | FAIL |
| ns-red on white | ~4.8:1 | - | AA |

### Fixes needed

```css
/* Darken ns-green for text usage (not backgrounds) */
--ns-green-text: oklch(0.45 0.15 150);  /* Darker green for text: ~5.5:1 on white */
--ns-amber-text: oklch(0.55 0.15 75);   /* Darker amber: ~4.5:1 on white */

/* Use these for text, keep originals for backgrounds/badges */
```

### Dietary label accessibility

Dietary labels must not rely on color alone (WCAG 1.4.1):

```tsx
// BAD: Color-only indication
<Badge className="bg-ns-green-light text-ns-green">vegan</Badge>

// GOOD: Color + icon + text
<Badge className="bg-ns-green-light text-ns-green-text">
  <Check className="h-3 w-3 mr-1" aria-hidden="true" />
  vegan
  <span className="sr-only">(verified compliant)</span>
</Badge>

// For non-compliant:
<Badge variant="outline" className="text-muted-foreground">
  <X className="h-3 w-3 mr-1" aria-hidden="true" />
  not vegan
  <span className="sr-only">(does not meet this dietary requirement)</span>
</Badge>
```

### Screen reader patterns

#### Dish card

```tsx
<article aria-label={`${dish.name} from ${dish.restaurant_name}`}>
  <Link href={`/dish/${dish.id}`} aria-label={`View details for ${dish.name}`}>
    <Card>
      <img src={url} alt={`Photo of ${dish.name}`} />
      <CardContent>
        <h3>{dish.name}</h3>
        <p className="sr-only">
          {cal} calories, {pro} grams protein, {carb} grams carbs, {fat} grams fat.
          {waitMinutes ? `Estimated wait: ${waitMinutes} minutes.` : ""}
          {confidence ? `Nutrition data confidence: ${Math.round(confidence * 100)} percent.` : ""}
        </p>
        {/* Visual macro bar — aria-hidden since we have sr-only text above */}
        <div aria-hidden="true">
          <MacroBar ... />
        </div>
      </CardContent>
    </Card>
  </Link>
</article>
```

#### Confidence dot

```tsx
// Current implementation uses Tooltip — good. Add aria-label:
<TooltipTrigger
  className={`inline-block h-2.5 w-2.5 rounded-full ${color}`}
  aria-label={`${label}${confidence != null ? ` (${Math.round(confidence * 100)}%)` : ""}${source ? ` — ${source}` : ""}`}
/>
```

#### Filter chips

```tsx
// Use toggle pattern with aria-pressed
<button
  role="switch"
  aria-pressed={active}
  aria-label={`Filter by ${label}`}
  className={...}
  onClick={() => toggle(label)}
>
  {label}
</button>
```

### Keyboard navigation

1. **Dish grid:** Cards should be focusable via Tab. Use `tabIndex={0}` on the Link wrapper.
2. **Filter row:** Arrow keys should navigate between filter chips (implement with `roving tabindex` pattern or use shadcn's ToggleGroup which handles this).
3. **Photo carousel:** Left/Right arrows, with visible focus indicators.
4. **Skip link:** Add to layout.tsx:

```tsx
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:bg-background focus:px-4 focus:py-2 focus:rounded-md focus:shadow-lg focus:text-sm focus:font-medium"
>
  Skip to main content
</a>
```

### Reduced motion

```tsx
// Respect prefers-reduced-motion globally
import { useReducedMotion } from "framer-motion";

// In any animated component:
const prefersReducedMotion = useReducedMotion();

// Or via CSS:
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 10. Dietary Label System

### Standard dietary icons + colors

| Diet | Icon (Lucide) | Color | Badge class |
|------|---------------|-------|-------------|
| Vegan | `Leaf` | `ns-green` | `diet-compliant` |
| Vegetarian | `Sprout` | `ns-green` | `diet-compliant` |
| Gluten-free | `WheatOff` | `ns-green` | `diet-compliant` |
| Dairy-free | `MilkOff` | `ns-green` | `diet-compliant` |
| Nut-free | `ShieldCheck` | `ns-green` | `diet-compliant` |
| Halal | Custom SVG | `ns-green` | `diet-compliant` |
| Kosher | Custom SVG | `ns-green` | `diet-compliant` |
| Contains allergen | `AlertTriangle` | `ns-red` | `diet-danger` |
| Unknown/unverified | `HelpCircle` | `ns-amber` | `diet-warning` |

### Dietary badge component

```tsx
import { Leaf, Sprout, WheatOff, ShieldCheck, AlertTriangle, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const DIET_CONFIG: Record<string, { icon: React.ElementType; label: string }> = {
  vegan: { icon: Leaf, label: "Vegan" },
  vegetarian: { icon: Sprout, label: "Vegetarian" },
  gluten_free: { icon: WheatOff, label: "Gluten-Free" },
  dairy_free: { icon: MilkOff, label: "Dairy-Free" },
  nut_free: { icon: ShieldCheck, label: "Nut-Free" },
  halal: { icon: ShieldCheck, label: "Halal" },
  kosher: { icon: ShieldCheck, label: "Kosher" },
};

interface DietBadgeProps {
  diet: string;
  status: "compliant" | "non-compliant" | "unknown";
  confidence?: number;
}

export function DietBadge({ diet, status, confidence }: DietBadgeProps) {
  const config = DIET_CONFIG[diet];
  if (!config) return null;
  const Icon = config.icon;

  const variant = status === "compliant" ? "diet-compliant"
    : status === "non-compliant" ? "diet-danger"
    : "diet-warning";

  const StatusIcon = status === "non-compliant" ? AlertTriangle
    : status === "unknown" ? HelpCircle : Icon;

  return (
    <Badge variant={variant}>
      <StatusIcon className="h-3 w-3 mr-1" aria-hidden="true" />
      {config.label}
      {confidence != null && (
        <span className="ml-1 opacity-70 text-[10px]">
          {Math.round(confidence * 100)}%
        </span>
      )}
      <span className="sr-only">
        {status === "compliant" ? "(verified)" : status === "non-compliant" ? "(not compliant)" : "(unverified)"}
      </span>
    </Badge>
  );
}
```

### Allergen warning pattern

For users with allergies (celiac, nut allergy), warnings need to be prominent:

```tsx
export function AllergenWarning({ allergens }: { allergens: string[] }) {
  if (allergens.length === 0) return null;

  return (
    <div
      role="alert"
      className="flex items-start gap-2 p-3 rounded-lg bg-ns-red-light border border-ns-red/20"
    >
      <AlertTriangle className="h-4 w-4 text-ns-red shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-medium text-ns-red">Allergen Warning</p>
        <p className="text-xs text-ns-red/80 mt-0.5">
          May contain: {allergens.join(", ")}
        </p>
      </div>
    </div>
  );
}
```

---

## 11. Macro Visualization System

### Macro ring component (for detail views and profile)

```tsx
"use client";

interface MacroRingProps {
  value: number;
  max: number;
  label: string;
  unit: string;
  color: string; // Tailwind color class
  size?: number;
}

export function MacroRing({ value, max, label, unit, color, size = 80 }: MacroRingProps) {
  const percentage = Math.min((value / max) * 100, 100);
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          {/* Background ring */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" strokeWidth={4}
            className="stroke-muted"
          />
          {/* Progress ring */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" strokeWidth={4} strokeLinecap="round"
            className={`stroke-${color} transition-all duration-700 ease-out`}
            style={{ strokeDasharray: circumference, strokeDashoffset }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-bold tabular-nums">{value}</span>
          <span className="text-[10px] text-muted-foreground">{unit}</span>
        </div>
      </div>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </div>
  );
}

// Usage:
<div className="flex justify-around py-4">
  <MacroRing value={450} max={2000} label="Calories" unit="cal" color="ns-calories" />
  <MacroRing value={38} max={150} label="Protein" unit="g" color="ns-protein" />
  <MacroRing value={42} max={250} label="Carbs" unit="g" color="ns-carbs" />
  <MacroRing value={12} max={65} label="Fat" unit="g" color="ns-fat" />
</div>
```

### Stacked bar enhancement

The current `MacroBar` is functional. Enhance with:

```tsx
// Add interactive hover showing exact values
export function MacroBar({ calories, protein_g, carbs_g, fat_g, highlight }: MacroBarProps) {
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);

  // ... existing calculations ...

  return (
    <div className="space-y-1">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted relative">
        {[
          { key: "protein", value: pro, total, color: "bg-ns-protein", label: `${pro}g protein` },
          { key: "carbs", value: carb, total, color: "bg-ns-carbs", label: `${carb}g carbs` },
          { key: "fat", value: fat, total, color: "bg-ns-fat", label: `${fat}g fat` },
        ].map(({ key, value, color, label }) => (
          <div
            key={key}
            className={cn(
              color, "transition-all duration-300 cursor-pointer",
              highlight === key ? "opacity-100" : "opacity-70",
              hoveredSegment === key && "opacity-100 brightness-110"
            )}
            style={{ width: `${(value / total) * 100}%` }}
            onMouseEnter={() => setHoveredSegment(key)}
            onMouseLeave={() => setHoveredSegment(null)}
            title={label}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground tabular-nums">
        {cal} cal{" "}
        <span className={cn(highlight === "protein" && "font-medium text-ns-protein")}>
          {pro}g P
        </span>{" "}
        <span className={cn(highlight === "carbs" && "font-medium text-ns-carbs")}>
          {carb}g C
        </span>{" "}
        <span className={cn(highlight === "fat" && "font-medium text-ns-fat")}>
          {fat}g F
        </span>
      </p>
    </div>
  );
}
```

---

## 12. Navigation & Information Architecture

### Mobile navigation pattern

Use a bottom tab bar (not hamburger menu) for primary navigation:

```tsx
const NAV_ITEMS = [
  { href: "/", icon: Search, label: "Discover" },
  { href: "/scan", icon: Camera, label: "Scan" },
  { href: "/saved", icon: Bookmark, label: "Saved" },
  { href: "/profile", icon: User, label: "Profile" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 safe-bottom">
      <div className="flex items-center justify-around h-14 max-w-2xl mx-auto">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors min-w-[64px]",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

Add safe area inset for iPhone notch/home indicator:

```css
.safe-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
```

### Header pattern

```
┌─────────────────────────────────────────┐
│ FoodClaw    [Search input]   [Avatar] │  Sticky top, blurred bg
│ [vegan] [gf] [halal] [kosher] [df] >>> │  Horizontally scrollable chips
│ [Best Match] [Nearest] [Top Rated] >>> │  Sort pills
└─────────────────────────────────────────┘
```

### Filter bottom sheet (mobile)

Instead of the horizontal chip row for complex filtering, use a bottom sheet:

```tsx
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Slider } from "@/components/ui/slider";

export function FilterDrawer() {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Filter Dishes</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-8 space-y-6">
          {/* Dietary restrictions */}
          <div>
            <h4 className="text-sm font-medium mb-3">Dietary Needs</h4>
            <div className="flex flex-wrap gap-2">
              {DIETS.map(diet => (
                <DietFilterChip key={diet} diet={diet} />
              ))}
            </div>
          </div>

          {/* Macro goals */}
          <div>
            <h4 className="text-sm font-medium mb-3">Protein (min grams)</h4>
            <Slider defaultValue={[0]} max={60} step={5} />
          </div>

          <div>
            <h4 className="text-sm font-medium mb-3">Max Calories</h4>
            <Slider defaultValue={[800]} max={1500} step={50} />
          </div>

          {/* Distance */}
          <div>
            <h4 className="text-sm font-medium mb-3">Max Distance</h4>
            <Slider defaultValue={[2]} max={10} step={0.5} />
          </div>

          <Button className="w-full" size="lg">
            Apply Filters
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
```

### Search command palette (Cmd+K)

```tsx
import { Command, CommandInput, CommandList, CommandGroup, CommandItem } from "@/components/ui/command";

export function DishSearch() {
  return (
    <Command className="rounded-lg border shadow-md">
      <CommandInput placeholder="Search dishes, restaurants, cuisines..." />
      <CommandList>
        <CommandGroup heading="Recent">
          <CommandItem>Chicken Shawarma Bowl</CommandItem>
          <CommandItem>Salmon Poke</CommandItem>
        </CommandGroup>
        <CommandGroup heading="Popular near you">
          <CommandItem>Grilled Chicken Breast</CommandItem>
          <CommandItem>Açaí Bowl</CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
```

---

## 13. Implementation Roadmap

### Phase 1: Foundation (Week 1)

1. Update `globals.css` with the complete color system (warm whites, semantic colors, dark mode)
2. Install `next-themes`, add `ThemeProvider` to layout
3. Install `framer-motion`
4. Add missing shadcn components: `sheet`, `drawer`, `dialog`, `dropdown-menu`, `select`, `toggle-group`, `scroll-area`, `command`, `carousel`, `progress`, `avatar`
5. Create `lib/motion.ts` with animation tokens
6. Add skip link to layout
7. Add safe-area CSS

### Phase 2: Components (Week 2)

1. Build `DietBadge` component with icons and accessibility
2. Build `MacroRing` SVG component
3. Build `BottomNav` with active states
4. Build `ThemeToggle` component
5. Build `FilterDrawer` with slider-based macro filtering
6. Build `AllergenWarning` component
7. Enhance `DishCard` with photo overlays, 16:10 aspect ratio, interactive variant
8. Enhance `MacroBar` with hover states and highlighted segments
9. Add Framer Motion stagger to dish grid

### Phase 3: Polish (Week 3)

1. Shimmer skeleton animations
2. AI scan overlay animation
3. Photo carousel with Framer Motion gestures
4. Pull-to-refresh pattern
5. Command palette (Cmd+K) search
6. Reduced motion media query support
7. Full accessibility audit with axe-core
8. Contrast ratio fixes for amber/green text

### Phase 4: Advanced (Week 4)

1. View toggle (grid vs list)
2. Infinite scroll with intersection observer
3. Optimistic UI for saved dishes
4. Share sheet for dish cards
5. Print-friendly macro detail view
6. PWA manifest + service worker for offline saved dishes

---

## Appendix A: Icon Library

Use **Lucide React** (already installed). Key icons for FoodClaw:

| Feature | Icon | Import |
|---------|------|--------|
| Search | `Search` | `lucide-react` |
| Scan/Camera | `Camera`, `ScanLine` | `lucide-react` |
| Filter | `SlidersHorizontal` | `lucide-react` |
| Distance | `MapPin` | `lucide-react` |
| Wait time | `Clock` | `lucide-react` |
| Delivery | `Truck`, `Bike` | `lucide-react` |
| Rating | `Star` | `lucide-react` |
| Save/Bookmark | `Bookmark`, `Heart` | `lucide-react` |
| Vegan | `Leaf` | `lucide-react` |
| Gluten-free | `WheatOff` | `lucide-react` |
| Warning | `AlertTriangle` | `lucide-react` |
| Confidence | `ShieldCheck`, `ShieldAlert` | `lucide-react` |
| Calories | `Flame` | `lucide-react` |
| Protein | `Dumbbell` or `Beef` | `lucide-react` |
| Share | `Share2` | `lucide-react` |
| Back | `ArrowLeft`, `ChevronLeft` | `lucide-react` |
| Theme | `Sun`, `Moon`, `Monitor` | `lucide-react` |
| Profile | `User`, `UserCircle` | `lucide-react` |
| Refresh | `RefreshCw` | `lucide-react` |

## Appendix B: Tailwind Config Extensions

Since Tailwind v4 uses CSS-based configuration, add these custom utilities in `globals.css`:

```css
/* Scrollbar hiding for filter rows */
@layer utilities {
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
}

/* Custom aspect ratio for food photos */
@layer utilities {
  .aspect-food {
    aspect-ratio: 16 / 10;
  }
}

/* Tabular nums for macro data */
@layer utilities {
  .tabular-nums {
    font-variant-numeric: tabular-nums;
  }
}

/* Safe area padding */
@layer utilities {
  .safe-bottom {
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
  .safe-top {
    padding-top: env(safe-area-inset-top, 0px);
  }
}
```

## Appendix C: Performance Budget

| Metric | Target | Current Risk |
|--------|--------|--------------|
| LCP (Largest Contentful Paint) | < 2.5s | Food photos — use `next/image` with blur placeholders |
| FID (First Input Delay) | < 100ms | OK with client components |
| CLS (Cumulative Layout Shift) | < 0.1 | Set explicit aspect ratios on all images |
| JS bundle (initial) | < 150KB gzipped | Framer Motion adds ~30KB — use tree shaking |
| Font files | < 100KB | Geist is ~40KB for 2 weights |

### Image optimization

```tsx
// Always use next/image for food photos
import Image from "next/image";

<Image
  src={dish.photo_url}
  alt={`Photo of ${dish.name}`}
  fill
  sizes="(max-width: 640px) 100vw, 50vw"
  className="object-cover"
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRg..."
/>
```

---

*This design system is tailored specifically for FoodClaw's existing codebase (Next.js 16, Tailwind v4, shadcn/ui v4 base-nova style, OKLCH color space). All recommendations build on top of the existing `globals.css`, `dish-card.tsx`, `macro-bar.tsx`, and component infrastructure.*
