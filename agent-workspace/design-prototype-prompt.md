# FoodClaw App Design Prompt
## Use this prompt on Lovable, Manus, Replit to generate UI prototypes

---

Build a beautiful, premium mobile-first food discovery web app called **FoodClaw** — a dish-first food discovery platform (NOT restaurant-first). Users search for specific dishes filtered by dietary restrictions and nutritional goals.

## Visual Style
- Premium, screenshot-worthy design that belongs on Awwwards
- Modern minimalism with warm, appetite-stimulating accents
- Glassmorphic cards with soft shadows and backdrop-blur effects
- Smooth micro-interactions and scroll-triggered animations
- Reference quality: Uber Eats meets MyFitnessPal meets Linear design system

## Color Palette
- Primary: Warm emerald green (health + freshness)
- Accent: Warm coral/orange (appetite-stimulating)
- Surfaces: Clean whites with subtle warm tints
- Dark mode: Deep blue-black (#121212 range), never pure black
- Nutrition color coding: Blue for protein, Yellow for carbs, Orange for fat

## Typography
- Display/heading font: A distinctive serif or display font (DM Serif Display, Playfair Display, or similar)
- Body font: Clean, modern sans-serif (Plus Jakarta Sans or similar)
- Tabular numbers for nutritional data

## Pages to Build

### 1. Home / Search Page (Main)
- Top: Search bar with typeahead suggestions
- Category pills: horizontal scroll (Sushi, Pizza, Salads, Bowls, Tacos, etc.) with icons
- Tab switcher: "Dishes" | "Restaurants" | "Cook It Myself" (locked/coming soon)
- Sort options: Best Match, Nearest, Top Rated, Shortest Wait
- Filter drawer: dietary restrictions (Vegan, Vegetarian, Gluten-Free, Halal, Kosher, Nut-Free), allergens, macro goals
- Grid of dish cards (see below)
- Bottom navigation bar with frosted glass effect

### 2. Dish Card (Core Component)
Each dish card shows:
- 3:2 aspect ratio food photo with gradient overlay
- Star rating badge (top left, glassmorphic)
- Favorite heart button (top right, animated)
- Distance badge + Wait time badge (bottom of photo, glassmorphic pills)
- Dish name (bold)
- Restaurant name (muted)
- Macro bar visualization: horizontal stacked bar showing protein/carbs/fat ratio
- Calorie count with confidence indicator dot (green=high, yellow=medium, red=low)
- Delivery platform icons (DoorDash, UberEats, etc.)
- Hover: subtle lift + shadow increase + photo zoom

### 3. Dish Detail Page
- Full-width photo carousel with dot indicators
- Back button overlay
- Large dish name + restaurant name
- Nutrition facts card with detailed macro ranges (min-max for calories, protein, carbs, fat)
- Dietary flags section: green badges for confirmed safe, outline for unknown
- Source transparency section: how macros were calculated (restaurant data, USDA, AI vision analysis)
- Reviews section: praise tags (green) and complaint tags (red)
- Similar dishes section at bottom
- Sticky CTA: "View on DoorDash" / "Get Directions"

### 4. Profile Page
- User avatar + name
- Dietary preferences editor
- Nutritional goals selector (Max Protein, Min Calories, Balanced, etc.)
- Favorites list
- Settings (dark mode toggle, location permissions)

### 5. Onboarding (3-step flow)
- Step 1: "What dietary restrictions do you have?" (multi-select with icons)
- Step 2: "What's your nutritional goal?" (single select: Max Protein, Min Calories, Balanced, etc.)
- Step 3: "Allow location access" (illustration + permission request)

## Interactions & Animations
- Page load: staggered card reveal (fade-up, 50ms delay between cards)
- Scroll: parallax effect on hero sections
- Favorite toggle: heart scale + color animation
- Search: smooth focus expansion with blur background
- Tab switching: smooth content fade transition
- Pull-to-refresh on mobile
- Loading: shimmer skeleton cards
- Hover on cards: lift (-2px translate) + shadow increase + photo subtle zoom

## Technical Requirements
- Mobile-first responsive design (375px primary, up to 1280px)
- Bottom navigation for mobile, sidebar for desktop
- Frosted glass (backdrop-blur) effects on nav, modals, badges
- CSS custom properties for theming
- Dark mode support with proper contrast ratios (4.5:1 WCAG)
- Safe area insets for notched phones

## Sample Data
Use realistic food data:
- "Spicy Tuna Poke Bowl" — $16, 480-520 cal, 32g protein, 4.7★, 0.3 mi, ~15 min wait
- "Grilled Chicken Caesar Salad" — $14, 380-420 cal, 42g protein, 4.5★, 0.8 mi, ~10 min wait
- "Margherita Pizza" — $18, 720-800 cal, 28g protein, 4.8★, 1.2 mi, ~25 min wait
- "Acai Bowl with Granola" — $13, 340-380 cal, 8g protein, 4.3★, 0.5 mi, ~5 min wait
- "Korean BBQ Bibimbap" — $17, 580-650 cal, 35g protein, 4.6★, 1.5 mi, ~20 min wait
- "Avocado Toast with Poached Egg" — $12, 320-360 cal, 14g protein, 4.4★, 0.2 mi, ~8 min wait
- "Pad Thai with Shrimp" — $15, 520-580 cal, 24g protein, 4.5★, 0.7 mi, ~18 min wait
- "Mediterranean Quinoa Bowl" — $14, 420-460 cal, 18g protein, 4.6★, 0.4 mi, ~12 min wait
