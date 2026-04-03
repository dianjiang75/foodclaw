# Manus FoodClaw — Visual Design Debrief

**Live URL:** https://predeploy-55865036-foodclaw-pbnb9um8-5frnmsir4njyt77b.manus.space/
**Manus Project:** https://manus.im/app/Vb7DTjFCNBJCyh1OM6JkZN
**Date:** 2026-04-02

---

## Screenshot Index

All screenshots were captured live from the Manus build. Reference IDs from the capture session:

### 1. HOME PAGE — Hero Section (Desktop)
**Screenshot IDs:** ss_39840w969, ss_9920chvhf

**What's visible:**
- Full-width food photography hero banner (spices, salt, herbs, lemons, tomatoes on rustic wooden surface)
- "FOODCLAW" brand in small caps, letter-spaced, warm cream color
- "Find the dish" in large Fraunces serif — warm cream/white
- "you're craving." in Fraunces italic — slightly lighter, elegant
- Two glassmorphic stat pills: "8 dishes" + "Dish-first discovery"
- Below hero: Search bar "Search dishes, ingredients, cuisines..." with separate "Filters" button
- Category pills: "✨ All Dishes" (filled terracotta), "🍳 Breakfast", "☀️ Lunch", "🌙 Dinner"
- Warm cream (#faf7f2) background throughout

**Design notes:**
- Hero image is AI-generated, very high quality — looks like professional food photography
- Typography hierarchy is immediately clear: brand → heading → subheading → UI elements
- The serif italic "you're craving." adds elegance and personality
- Sticky search/filter bar stays below hero on scroll

---

### 2. HOME PAGE — Dish Cards (Desktop)
**Screenshot ID:** ss_5614ido2b

**What's visible:**
- "Featured Dishes" section header in serif bold
- "Handpicked by our food editors" subtitle in muted text
- 3-column card grid (horizontal scroll on mobile)
- Card 1: Avocado toast photo with "🔥 Trending" green badge (top-left), heart button (top-right), dietary badges at bottom: "🥬 Vegetarian" + "🧀 Dairy-Free"
- Card 2: Ramen/pork dish with heart, badges: "🧀 Dairy-Free" + "💪 High Protein"
- Card 3: Truffle pasta with heart, badges: "🥬 Vegetarian" + "💪 High Protein"

**Design notes:**
- Cards use portrait orientation with large square-ish food photos
- Dietary badges are overlaid at the bottom of the photo — very scannable
- Each badge has an emoji prefix + colored background (green for vegetarian, blue for dairy-free, orange for high protein)
- "Trending" badge is green with fire emoji — social proof
- Heart/save button is a white circle with outline heart

---

### 3. DISH DETAIL — Hero + Info (Desktop)
**Screenshot ID:** ss_39421qb9r

**What's visible:**
- Full-bleed food photo (avocado toast with poached egg — stunning close-up)
- Back arrow button (top-left, dark circle)
- Heart/save button (top-right, dark circle)
- Dietary badges overlaying bottom of photo: "🥬 Vegetarian" "🧀 Dairy-Free" "💪 High Protein"
- Below photo on cream background:
  - "AMERICAN · No spice" — cuisine label + spice level in small caps
  - "Avocado Toast 🍳 Poached Egg" — dish name in Fraunces serif, large and bold
  - Full description paragraph in body text
  - Sticky bottom bar: "Starting from $16" + "Order Now" terracotta button

**Design notes:**
- The back/heart buttons use dark translucent circles — clean overlay on photo
- Dietary badges on the photo create immediate visual identification
- Cuisine + spice level is a nice touch we don't have
- The serif heading makes the dish name feel like a restaurant menu item
- Sticky CTA persists through scroll — always accessible

---

### 4. DISH DETAIL — Rating + Price (Desktop)
**Screenshot ID:** ss_8702lmpcl

**What's visible:**
- Same hero photo (slightly scrolled)
- Below info section:
  - "⭐ 4.8 (892 reviews)" — star rating with review count
  - "$ 16" — price in green/accent color
  - Horizontal divider line
  - "Nutritional Breakdown" heading starting to appear

**Design notes:**
- Rating and price on same line — clean and scannable
- Review count adds social proof
- Section dividers are subtle thin lines

---

### 5. DISH DETAIL — Restaurant Card (from Manus preview)
**Previously captured in Manus preview panel**

**What was visible:**
- Restaurant name: "The Morning Ritual"
- "Open Now" badge in green (top-right of card)
- "⭐ 4.7 (1,240)" star rating with count
- Price range: "$$"
- Address: "📍 142 Elm Street, Williamsburg"
- Distance: "⏱ 0.3 mi away"
- Phone: "📞 +1 (718) 555-0142"
- "Get Directions >" full-width CTA button (terracotta/green)
- "More American Dishes" section below with 2 related dish cards

**Design notes:**
- Restaurant card is a complete, self-contained info unit
- "Open Now" badge provides real-time utility
- Address, distance, phone all have appropriate icons
- Related dishes section uses same visual language as main cards

---

### 6. BOTTOM NAVIGATION (visible in all home screenshots)

**What's visible:**
- 4-tab bottom nav: Discover (🏠), Search (🔍), Saved (❤️), Profile (👤)
- Active tab: "Discover" with warm terracotta color and dot indicator below
- Inactive tabs: muted gray
- Solid white/cream background (no frosted glass)
- Clean icon + label layout

**Design notes:**
- 4-tab nav vs our 3-tab — has dedicated Search and Saved tabs
- No frosted glass (ours is more premium in this regard)
- Active indicator is a small dot below the icon — subtle

---

## Color Palette Extracted

| Element | Color | Hex Estimate |
|---------|-------|-------------|
| Background (cream) | Warm linen | #faf7f2 |
| Primary accent (terracotta) | Warm earth | #b85c38 |
| Active pill fill | Deep terracotta | #a0522d |
| Text (heading) | Dark warm brown | #2c1810 |
| Text (body) | Medium warm brown | #5c4033 |
| Text (muted) | Light warm gray | #9c8b7e |
| Trending badge | Olive green | #4a7c59 |
| Vegetarian badge | Green | #3d8b37 |
| Dairy-Free badge | Teal blue | #4a90a4 |
| High Protein badge | Warm orange | #d4853a |
| Card background | White | #ffffff |
| Shadows | Warm tinted | rgba(139,90,43,0.08) |

## Typography Extracted

| Element | Font | Weight | Size Est |
|---------|------|--------|----------|
| Brand "FOODCLAW" | Sans (Jakarta) | 600 | 14px, letter-spacing 0.2em |
| Hero heading | Fraunces | 700 | 48-56px |
| Hero italic | Fraunces Italic | 400 | 48-56px |
| Section headers | Fraunces | 600 | 24px |
| Dish name | Fraunces | 700 | 28-32px |
| Body text | Plus Jakarta Sans | 400 | 16px |
| Badges | Plus Jakarta Sans | 500 | 12-13px |
| Category pills | Plus Jakarta Sans | 500 | 14px |
| Price | Plus Jakarta Sans | 700 | 20px |

---

## Pages Built by Manus (7-step build)

1. Global CSS design system (13,000+ chars — "Warm Organic Modernism")
2. Google Fonts setup (Fraunces + Plus Jakarta Sans)
3. Data model with nutritional + dietary info
4. NutritionRing SVG component (animated macro donut)
5. DietaryBadge component
6. DishCard component with hover effects + save
7. BottomNav component
8. FilterSheet (bottom sheet for dietary/nutritional filters)
9. Home/Discover page (hero, search, categories, cards)
10. DishDetail page (photo, nutrition breakdown, restaurant info, similar dishes)
11. Search page (full-screen search experience)
12. Saved page (favorited dishes)
13. Profile page (dietary preferences + nutritional goals)
