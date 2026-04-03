# Manus FoodClaw UI Debrief — Item by Item

**Date:** 2026-04-02
**Source:** https://manus.im/app/Vb7DTjFCNBJCyh1OM6JkZN
**Build time:** ~15 minutes (7 steps)
**Design philosophy:** "Warm Organic Modernism" — earthy colors, elegant typography, handcrafted feel

---

## GLOBAL DESIGN DECISIONS

### 1. Typography: Fraunces + Plus Jakarta Sans
- **Heading font:** Fraunces (variable serif) — warm, organic, artisanal feel
- **Body font:** Plus Jakarta Sans — clean, modern, readable
- **Impact:** The serif/sans pairing immediately elevates the design from "tech app" to "premium food experience"
- **Our current:** Plus Jakarta Sans only (no display font)
- **VERDICT: IMPLEMENT** — Add Fraunces via Google Fonts for headings

### 2. Color Palette: Warm Earth Tones
- **Background:** Warm cream/linen (#faf7f2 range) — NOT pure white
- **Primary accent:** Warm terracotta/coral — earthy, appetizing
- **Text:** Deep warm brown — NOT pure black
- **Category pills:** Warm coral/red with white text (active), muted outline (inactive)
- **Cards:** White with warm shadow tinting
- **Our current:** Pure white bg, emerald green primary, oklch colors
- **VERDICT: CONSIDER** — Our emerald green is distinctive, but the warm cream background is worth testing

### 3. Warm Shadow System
- Shadows throughout are NOT gray — they're warm-tinted (brownish/amber undertones)
- Creates a cohesive "warm kitchen" feeling
- **Our current:** Default gray shadows
- **VERDICT: IMPLEMENT** — Change shadow colors to warm-tinted: `shadow-amber-900/5` instead of default

### 4. Border Radius: Large & Consistent
- Cards use ~16px radius (rounded-2xl)
- Buttons use full-round (rounded-full) for pills
- Consistent radius creates a soft, approachable feel
- **Our current:** Already using rounded-2xl on cards — matches
- **VERDICT: ALREADY HAVE** — Our radius system is similar

---

## HOME PAGE ELEMENTS

### 5. Hero Section with Food Photography Background
- Full-width hero with real food photography as background
- Dark gradient overlay for text readability
- "FOODCLAW" brand name in uppercase tracking (letter-spaced)
- "Find the dish you're craving." in large serif (Fraunces) italic
- Stats badges: "8 dishes" + "Dish-first discovery" as small pills overlaying the hero
- **Our current:** No hero section — jumps straight to search
- **VERDICT: IMPLEMENT** — This is the single biggest visual upgrade. Add a gradient hero card with our tagline

### 6. Search Bar
- Clean input with search icon, placeholder "Search dishes, ingredients, cuisines..."
- Separate "Filters" button with sliders icon to the right
- Rounded corners, subtle border, warm background tint
- **Our current:** SearchTypeahead inline with other header elements, no separate Filters button
- **VERDICT: IMPROVE** — Make search wider, add standalone Filters button like Manus

### 7. Category Pills (Meal Time Based)
- Horizontal scrolling pills: "All Dishes" (active/filled), "Breakfast", "Lunch", "Dinner", plus more
- Each pill has an emoji icon prefix (sparkles, egg, sun, moon)
- Active pill: filled coral/red background, white text
- Inactive: outline/muted style
- **Our current:** Category pills with custom SVG icons (Thai, Japanese, etc.) — cuisine-based, not meal-time
- **VERDICT: KEEP OURS** — Our cuisine-based categories are more useful for dish-first discovery. But steal the emoji icon approach and the filled/outline active state styling

### 8. "Featured Dishes" Section Header
- Section title: "Featured Dishes" in bold
- Subtitle: "Handpicked by our food editors" in muted text
- Creates editorial curation feel — not just "results"
- **Our current:** "6 dishes found" with "Sort by" — functional, not editorial
- **VERDICT: IMPLEMENT** — Add editorial section headers. "Trending Near You", "Popular This Week", "Staff Picks"

### 9. Dish Cards (THE KEY COMPONENT)

#### 9a. Card Layout
- Portrait-oriented cards in a 2-column grid
- Full-bleed food photo at top (~60% of card height)
- White content area below with dish info
- Rounded corners (16px) with warm shadow
- **Our current:** Similar layout but landscape photos (3:2), single column on narrow mobile
- **VERDICT: KEEP OURS** — Our 3:2 landscape ratio shows food better. But the 2-col grid for mobile is worth testing

#### 9b. "Trending" Badge
- Top-left on photo: green "Trending" badge with fire/sparkle icon
- Glassmorphic or solid green background
- **Our current:** No trending/popularity indicators on cards
- **VERDICT: IMPLEMENT** — Add "Trending", "Popular", "New" badges to cards based on data

#### 9c. Heart/Save Button
- Top-right on photo: white heart icon in a circle
- Outline when not saved, filled when saved
- **Our current:** Similar — heart button top-right, fill red when active
- **VERDICT: ALREADY HAVE** — Our implementation is similar

#### 9d. Dietary Badges on Cards
- Below the photo, prominent colored badges: "Vegetarian" (green), "Dairy-Free" (blue/teal)
- Clearly visible, scannable at a glance
- **Our current:** Dietary badges exist in dish detail but NOT on the card in the grid
- **VERDICT: IMPLEMENT** — This is critical for our target users. Show top 2 dietary badges on each card

#### 9e. Cuisine Label
- Below dietary badges: "American" cuisine label in muted text
- **Our current:** Restaurant name shown, not cuisine type
- **VERDICT: CONSIDER** — Could add cuisine tag alongside restaurant name

#### 9f. Price Display
- Green price text: "$14" prominently displayed
- **Our current:** No price on cards (we don't have price data in our model currently)
- **VERDICT: FUTURE** — Add when we have price data from menus

#### 9g. Nutrition Ring (SVG Component)
- Manus built a custom NutritionRing SVG component for animated macro visualization
- Donut chart showing protein/carbs/fat proportions
- Animates on mount with stroke-dasharray transitions
- **Our current:** Horizontal stacked bar (protein blue, carbs yellow, fat orange)
- **VERDICT: CONSIDER** — The donut ring is visually striking but our horizontal bar is more space-efficient for cards. Could use ring on detail page

---

## DISH DETAIL PAGE

### 10. Restaurant Info Card
- Restaurant name: "The Morning Ritual" in bold
- "Open Now" badge in green (top-right)
- Star rating: "4.7 (1,240)" with star icon + review count
- Price range: "$$" indicator
- Address with pin icon: "142 Elm Street, Williamsburg"
- Distance: "0.3 mi away" with clock icon
- Phone number: "+1 (718) 555-0142" with phone icon
- "Get Directions" CTA button (full-width, warm coral/green)
- **Our current:** Restaurant info scattered, no "Open Now" badge, no phone number
- **VERDICT: IMPLEMENT** — Add "Open Now" badge, format address/phone as a clean card

### 11. "More American Dishes" Section
- Shows related dishes from same cuisine
- 2-column grid with food photos, dish name, price
- Cards: "Pan-Seared Salmon $28", "Acai Power Bowl $15"
- **Our current:** "Similar Dishes" section exists with basic cards
- **VERDICT: IMPROVE** — Make similar dishes section more visual with better photo cards

### 12. Sticky Bottom CTA
- "Starting from $16" text on left
- "Order Now" button on right (warm coral/green, full-round)
- Sticky at bottom of screen
- **Our current:** No sticky CTA on dish detail
- **VERDICT: IMPLEMENT** — Add sticky bottom bar with "View on DoorDash" / "Get Directions"

---

## BOTTOM NAVIGATION

### 13. Bottom Nav Bar
- 4 tabs: Discover (home), Search, Saved (heart), Profile
- Clean icons with labels below
- Active tab: warm coral/terracotta color
- Inactive: muted gray
- No frosted glass effect (solid background)
- **Our current:** 3 tabs: Dishes, Restaurants, Cook It Myself. Uses frosted glass backdrop-blur
- **VERDICT: KEEP OURS** — Our frosted glass is more premium. But consider adding Search + Saved as separate tabs

---

## PAGES MANUS BUILT (observed in build log)

### 14. Full-Screen Search Page
- Dedicated search experience (not just a bar)
- Full-screen overlay or page with results
- **Our current:** Inline search typeahead in header
- **VERDICT: CONSIDER** — Full-screen search could be better for mobile UX

### 15. Saved/Favorites Page
- Dedicated page showing user's favorited dishes
- **Our current:** /favorites page exists
- **VERDICT: ALREADY HAVE**

### 16. Profile Page with Dietary Preferences
- Settings for dietary preferences and nutritional goals
- **Our current:** /profile page exists with preferences
- **VERDICT: ALREADY HAVE**

### 17. Filter Sheet (Bottom Sheet)
- Dietary and nutritional filter drawer
- Slide-up bottom sheet pattern
- **Our current:** FilterDrawer using shadcn Sheet component
- **VERDICT: ALREADY HAVE** — But could improve the filter UI design

---

## DESIGN PATTERNS TO STEAL

### 18. AI-Generated Food Photography
- Manus generated 9 custom food images via AI
- Consistent lighting, angle, and styling across all photos
- Creates a cohesive visual identity
- **Our current:** Real restaurant photos (when available), generic placeholder otherwise
- **VERDICT: IMPROVE PLACEHOLDER** — For dishes without photos, generate better AI placeholders with consistent style

### 19. Warm Organic Color Language
- Everything speaks "warm kitchen" — cream backgrounds, terracotta accents, warm shadows
- No cold blues or clinical whites
- **Our current:** Emerald green primary + coral accent — already warm, but backgrounds are pure white
- **VERDICT: IMPLEMENT** — Change background from pure white to warm cream (#faf7f2), warm-tint all shadows

### 20. Editorial Curation Feel
- "Handpicked by our food editors" — implies human curation
- "Trending" badges — implies popularity/social proof
- Section headers with context — not just listing results
- **Our current:** Functional "X dishes found" + sort
- **VERDICT: IMPLEMENT** — Add editorial language: "Trending Near You", "Most Loved This Week", "Fresh Finds"

---

## PRIORITY IMPLEMENTATION LIST

### MUST IMPLEMENT (Highest Visual Impact)
1. **Display font (Fraunces)** for headings
2. **Hero section** with food photography + gradient overlay + tagline
3. **Dietary badges on dish cards** (Vegetarian, GF, etc.)
4. **Warm cream background** (#faf7f2) instead of pure white
5. **"Trending"/"Popular" badges** on dish cards
6. **Editorial section headers** ("Trending Near You", etc.)
7. **Sticky bottom CTA** on dish detail page

### SHOULD IMPLEMENT (Design Polish)
8. **Warm-tinted shadows** (amber-900/5 instead of gray)
9. **"Open Now" badge** on restaurant info
10. **Standalone Filters button** next to search
11. **Better similar dishes** section with larger photo cards
12. **Emoji icons** on category pills

### CONSIDER (Nice to Have)
13. **NutritionRing SVG** (donut chart) for dish detail page
14. **Full-screen search** page for mobile
15. **2-column dish card grid** on mobile (currently single-column on narrow)
16. **AI-generated placeholder photos** with consistent style
17. **Cuisine label** on dish cards alongside restaurant name

### KEEP AS-IS (Already Good)
- Frosted glass bottom nav (better than Manus's solid nav)
- 3:2 landscape photo ratio on cards
- Horizontal macro bar visualization
- Heart favorite animation
- Category pills with custom food icons (more useful than meal-time pills)
- oklch color space (more precise than hex)
- Confidence indicator dots (unique differentiator)
