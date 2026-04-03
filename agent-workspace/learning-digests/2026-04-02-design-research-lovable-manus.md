# Design Research: Lovable + Manus + Claude Code Design Tools

**Date:** 2026-04-02
**Type:** Design / Frontend
**Goal:** Learn how Lovable and Manus create polished, production-quality UI and apply those patterns to FoodClaw

---

## 1. Lovable's Design Approach

### Stack
- React 18 + Vite + TypeScript (NOT Next.js)
- **Tailwind CSS** with custom design tokens
- **shadcn/ui + Radix UI** for accessible, composable components
- Supabase for backend

### What Makes Lovable Apps Look Good

**Modular "LEGO" Prompting**: Build UI in discrete sections (hero, feature grid, pricing table) — not full pages at once. Each block has one purpose.

**Design Buzzwords as Parameters**: Lovable understands and applies:
- "minimal", "expressive", "cinematic", "playful", "premium", "developer-focused"
- These map to real changes in typography, spacing, shadows, border-radius, color

**Specific Visual Techniques:**
- Glassmorphism: `backdrop-blur` + gradient overlays for depth
- Glass sidebars, card-based layouts with subtle shadows
- Gradient fills on charts and interactive elements
- Floating action buttons with smooth animations
- Dark mode: avoid pure black (#121212 or #1C1C1E), maintain 4.5:1 contrast, desaturated accents

**The "Magic Design Formula" (from community):**
> "Create a [project] that belongs on Awwwards. Visual Style: [aesthetic], [color palette], [design trend]. Reference quality: Stripe/Linear/Framer level design. Screenshot-worthy."

**Design-First Principles:**
1. Establish visual language BEFORE functional layers
2. Use real content, not placeholders — reveals spacing/layout issues
3. Atomic UI vocabulary: cards, badges, toggles, chips, modals
4. Mobile-first responsive using Tailwind's standard breakpoints
5. Anticipate auth states, empty states, error states during design phase

### Lovable's Color Palette Approach
They define curated palettes as CSS variables:
- **Dark:** Purple Dream, Ocean Depth, Forest Night, Sunset Glow
- **Light:** Sky Fresh, Nature Clean, Warm Professional
- Each includes proper contrast ratios and WCAG accessibility

### Key Lovable Resources
- Lovable Prompting Bible: https://lovable.dev/blog/2025-01-16-lovable-prompting-handbook
- Lovable Boilerplate (40+ shadcn components): https://github.com/chihebnabil/lovable-boilerplate
- Open-Lovable (open-source clone): https://github.com/firecrawl/open-lovable

---

## 2. Manus's Design Approach

### Stack
- Full-stack conversational builder
- Production-ready code with database + backend
- Multi-agent architecture (parallel agents for research + build)

### What Makes Manus Apps Look Good

**Modern Minimalism with Soft Gradients** aesthetic:
- **Typography:** Playfair Display (serif) for headlines + Inter (sans-serif) for body
- **Colors:** Cream background with lavender-to-midnight-blue gradient accents
- **Components:** Glassmorphic cards with soft shadows
- **Animations:** Scroll-triggered reveals, hover lift effects, bouncy transitions (200ms ease-out)

**Key Design Traits:**
1. Dual-font pairing (display serif + clean sans)
2. Smooth scroll-triggered animations (staggered reveals)
3. SEO-optimized semantic HTML with proper heading hierarchy
4. Mobile-friendly responsive design out of the box
5. AI-powered Design View for visual fine-tuning (Manus 1.6+)

### Manus Takeaways for FoodClaw
- Pair a display/serif font with a clean sans-serif (we only use sans)
- Add scroll-triggered animations (currently none)
- Use soft gradients as background accents (we have flat colors)
- Implement glassmorphic card effects with backdrop-blur

---

## 3. Claude Code Design Skills & MCP Tools

### MUST INSTALL: Anthropic's Official Frontend Design Skill
- **117k weekly installs** — most popular official skill
- Pushes Claude to pick a real aesthetic direction BEFORE writing code
- Bans overused fonts (Inter, Roboto, Arial)
- Makes deliberate choices on typography, color, spacing, animations
- **Install:** Built into Claude Code plugins (see `anthropics/claude-code/plugins/frontend-design/`)

### MUST INSTALL: shadcn/ui MCP Server
- Official shadcn MCP: `claude mcp add --transport http shadcn https://www.shadcn.io/api/mcp`
- Gives Claude project-aware context about available components
- Finds, installs, composes, and customizes components correctly
- Alternative: Shadcnblocks Skill (2,500+ pre-built blocks): https://github.com/masonjames/Shadcnblocks-Skill

### SHOULD INSTALL: Figma MCP Server
- Official Figma MCP: connects at `https://mcp.figma.com/mcp`
- Pulls design context (components, styles, variables) into Claude Code
- Can write native Figma content from Claude Code
- Auto-generates design system rules from codebase

### SHOULD INSTALL: Storybook MCP
- Available in Storybook 10.3+ for React projects
- Gives Claude access to component metadata, stories, API docs
- Embeds live component previews in chat
- Runs component + accessibility tests automatically

### SHOULD INSTALL: Magic UI MCP
- Exposes Magic UI React + Tailwind component library
- Provides animated components: marquees, blur-fade text, animated grids
- Production-ready JSX with correct Tailwind classes

### OPTIONAL: Firecrawl Skill
- Web scraping for design inspiration
- Screenshot capture for visual reference
- Useful for competitive design analysis

### Key Design Configuration Tips
1. Add design direction to CLAUDE.md with specific aesthetics
2. Use CSS variables for consistent theming (we already do this)
3. Dominant colors + sharp accents > timid, evenly-distributed palettes
4. One orchestrated page-load animation (staggered reveals) > scattered micro-interactions
5. shadcn/ui v4 is "built for coding agents" — use the Skills detection feature

---

## 4. Gaps in FoodClaw's Current Design

| Area | Current State | Target (Lovable/Manus Level) |
|------|--------------|------------------------------|
| **Fonts** | Single sans-serif | Dual pairing (display + body) |
| **Animations** | None / basic transitions | Scroll-triggered reveals, staggered loads, hover lifts |
| **Glassmorphism** | backdrop-blur on nav only | Glass cards, frosted overlays, gradient depth |
| **Gradients** | None | Soft gradient accents, gradient text, gradient fills |
| **Shadows** | Basic card shadows | Layered, colored shadows (not just gray) |
| **Micro-interactions** | Favorite heart toggle | Button feedback, card hovers, loading animations |
| **Empty States** | Basic text | Illustrated, animated empty states |
| **Color System** | oklch (good!) | Add gradient presets + accent variations |
| **Dark Mode** | Has toggle | Needs polish: avoid pure black, desaturated accents |
| **Typography Scale** | Default Tailwind | Defined scale with display/heading/body/caption sizes |
| **Page Transitions** | None | Smooth route transitions with loading states |
| **Components** | 12 shadcn base | Need 25+ with custom variants |

---

## 5. Actionable Next Steps (Priority Order)

### Immediate (This Week)
1. **Install Anthropic's frontend-design skill** — stops generic "AI slop" output
2. **Install shadcn MCP** — gives Claude deep knowledge of available components
3. **Add 10+ shadcn components**: accordion, avatar, carousel, dropdown-menu, navigation-menu, progress, scroll-area, select, switch, toast
4. **Create design tokens file** with font pairings, gradient presets, shadow scales

### Short Term (Next Sprint)
5. **Add Framer Motion** for page transitions, scroll animations, staggered reveals
6. **Implement glass card variant** for dish cards with backdrop-blur + gradient overlay
7. **Add Google Fonts display font** (e.g., DM Serif Display, Playfair Display) for headings
8. **Create animated loading skeletons** with shimmer effect
9. **Polish dark mode** with proper contrast, desaturated accents, no pure black

### Medium Term
10. **Install Storybook** + MCP for component documentation and visual testing
11. **Add Magic UI animated components** (marquee, blur-fade, animated gradient)
12. **Create illustrated empty states** for no-results, no-favorites, etc.
13. **Implement route transition animations** between pages
