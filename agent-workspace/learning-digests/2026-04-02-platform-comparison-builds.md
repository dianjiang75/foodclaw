# Platform Comparison: FoodClaw Built on Lovable, Manus, Replit, Gamma

**Date:** 2026-04-02
**Type:** Design / UI/UX Comparison
**Goal:** Build FoodClaw prototype on 4 platforms, compare outputs, extract best patterns

---

## Build Status

| Platform | Status | Time | URL |
|----------|--------|------|-----|
| **Lovable** | COMPLETE | ~2 min | lovable.dev/projects/e2832831-4feb-4b3e-81a2-d42e1f3a29c3 |
| **Manus** | Building (3/7) | ~5 min | manus.im/app/Vb7DTjFCNBJCyh1OM6JkZN |
| **Replit** | Building (64%) | ~3 min | replit.com/@dianjiang75/Dish-Finder |
| **Gamma** | Generated | ~30 sec | gamma.app/generations/Mr09WTWEYJzggP8P3ibr4 |

---

## 1. LOVABLE Output Analysis

### What It Built
- Dark warm-toned mobile-first UI
- Hero section: gradient card "Find your perfect dish tonight" with subtitle "Dish-first discovery - Filter by your goals"
- Search bar: "Search dishes, cuisines..."
- Dietary filter chips with emoji icons: Vegan, Vegetarian, Keto, Gluten-Free (horizontal scroll)
- Dish cards with full-bleed food photos (Unsplash), gradient overlays
- Star rating glassmorphic badge (top-right)
- Nutrition info: calorie count + protein grams with fire/muscle icons
- Dietary tag badges: VEGAN, GLUTEN-FREE, DAIRY-FREE (uppercase, outlined)
- Price + "Add" button
- Bottom nav: Discover (active), Saved, Orders, Profile

### Design Choices
- **Fonts:** Space Grotesk (heading) + DM Sans (body) — NOT what we requested but distinctive
- **Colors:** Dark background (#1a1a2e ish), amber/orange accents, warm tones
- **Cards:** Full-width single column, generous padding, rounded corners
- **Layout:** Single column cards (not 2-col grid) — focuses on photos
- **Theme:** Dark mode by default — premium, food-photography-focused

### Strengths
1. Beautiful food photography integration (Unsplash)
2. Premium dark aesthetic that makes food pop
3. Clear nutritional data display
4. Dietary badges are prominent and scannable
5. Very fast to generate (~2 minutes)
6. Suggested follow-up actions ("Add dish detail page", "Add nutrition goal filters")

### Weaknesses
1. No macro visualization bar (just calorie + protein text)
2. No distance/wait time pills
3. No tab switcher (Dishes/Restaurants)
4. Single column layout wastes space on wider screens
5. No hover animations visible in preview
6. Missing our unique confidence indicator dots

---

## 2. MANUS Design Approach (Observed)

### What It's Doing
- Chose "Warm Organic Modernism" design philosophy (brainstormed 3 options, selected best)
- Generated 9 premium AI food images (salmon, acai bowl, tacos, green curry, etc.)
- **Fonts:** Fraunces (display serif) + Plus Jakarta Sans — excellent food-app pairing
- Writing 13,000+ char global CSS with custom design system
- Rich data model with nutritional and dietary information
- Building landing page, search, dish cards, navigation

### Key Insight: Manus Thinks Before Building
Unlike Lovable which just builds immediately, Manus:
1. Brainstormed 3 design philosophies
2. Selected the best one with reasoning
3. Generated custom images BEFORE building UI
4. Wrote comprehensive CSS design system BEFORE components
5. Created data model with all nutritional fields

### Font Choice Analysis
**Fraunces** (serif display) is a variable font with:
- Optical size axis — adapts from tiny captions to huge headlines
- "Wonk" axis — adds playful personality
- Perfect for food branding (warm, organic, artisanal feel)
- Pairs beautifully with Plus Jakarta Sans

---

## 3. REPLIT Design Approach (Observed)

### What It's Doing
- Building full-stack with database from the start
- Launched design subagent in PARALLEL with backend (efficient)
- Created OpenAPI spec first
- Built database schema, API routes, seeding realistic dish data
- At 64% progress building both frontend and backend simultaneously

### Key Insight: Replit Builds Full-Stack First
Unlike Lovable (UI-first) and Manus (design-first), Replit:
1. Creates API spec with all endpoints
2. Sets up database + schema
3. Builds API routes
4. Seeds realistic data
5. Launches design subagent in parallel
6. Preview loads after full-stack is ready

---

## 4. Cross-Platform Design Patterns to Steal

### Typography (Best: Manus)
- **Dual-font pairing is essential:** Display serif (Fraunces/DM Serif Display/Playfair) for headings + clean sans (Plus Jakarta Sans) for body
- Our current app: single font (Plus Jakarta Sans) — upgrade needed
- Manus's Fraunces choice is excellent for food branding

### Color Strategy (Best: Lovable)
- Dark mode by default makes food photos POP
- Amber/orange accents stimulate appetite
- Gradient hero cards add depth and warmth
- Our current app has good oklch foundation but needs more gradient usage

### Card Design (Best: Combination)
Best dish card would combine:
- Lovable's full-bleed photo approach
- Our existing macro bar visualization (unique differentiator)
- Manus's AI-generated food imagery style
- Glassmorphic rating badge (both Lovable and our app have this)
- Dietary tag badges inline (Lovable's approach — more scannable)

### Layout Strategy
- Single column for mobile (Lovable) — lets food photos shine
- 2-column grid for tablet+ (our current) — more scannable
- Keep both, optimize breakpoint

### Animation Strategy (Based on Research)
All platforms under-deliver on animations compared to prompts. Key additions:
1. Staggered card reveal on page load (framer-motion)
2. Smooth tab transitions (CSS transitions)
3. Card hover lift + photo zoom (we already have this!)
4. Shimmer skeleton loading (we have basic, needs polish)
5. Heart scale animation on favorite toggle

---

## 5. Actionable Upgrades for FoodClaw

### IMMEDIATE (steal from these builds)

1. **Add display font for headings**
   - Install Fraunces (Google Fonts) for display/heading use
   - Keep Plus Jakarta Sans for body
   - `font-display: swap` for performance

2. **Add gradient hero section to home page**
   - Warm gradient card above search: "Find your perfect dish tonight"
   - Matches Lovable's approach, adds visual hierarchy

3. **Enhance dish card dietary badges**
   - Move dietary tags to visible position on card (like Lovable's VEGAN, GF badges)
   - Currently we drop evaluator warnings in page.tsx mapping (known gap!)

4. **Upgrade dark mode**
   - Make it the default or at least equally polished
   - Dark backgrounds make food photography stand out dramatically

5. **Add macro icons next to calorie/protein counts**
   - Fire icon for calories, muscle icon for protein (like Lovable)
   - More scannable than just numbers

### SHORT TERM

6. **Install Framer Motion for animations**
   - Staggered card reveal (`stagger: 0.05`)
   - Page transition animations
   - Smooth filter drawer open/close

7. **Gradient overlays on card photos**
   - We have `from-black/50` gradient already — enhance with colored gradients
   - Try `from-emerald-900/20 via-transparent to-amber-900/10` for brand color tinting

8. **Glassmorphic component variants**
   - Create `glass` variant for Badge, Button, Card
   - `backdrop-blur-lg bg-white/10 border-white/20`

9. **Food photography placeholder upgrade**
   - Our "No photo yet" state is plain
   - Add gradient background + utensils icon (we have this, but could be more beautiful)

### TOOLS TO INSTALL

10. **Anthropic Frontend Design Skill** — `claude plugin add anthropic/frontend-design`
11. **shadcn MCP** — `claude mcp add --transport http shadcn https://www.shadcn.io/api/mcp`
12. **Magic UI MCP** — `npx @magicuidesign/cli@latest install claude`
13. **Framer Motion** — `npm install framer-motion`
