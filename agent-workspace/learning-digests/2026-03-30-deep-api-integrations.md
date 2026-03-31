# NutriScout Backend API Integrations -- Deep Research Report

> **Generated:** March 30, 2026
> **Purpose:** Comprehensive integration reference for every external API and data source NutriScout needs

---

## Table of Contents

1. [Google Places API (New)](#1-google-places-api-new)
2. [Yelp Fusion API](#2-yelp-fusion-api)
3. [USDA FoodData Central API](#3-usda-fooddata-central-api)
4. [Open Food Facts vs Nutritionix API](#4-open-food-facts-vs-nutritionix-api)
5. [BestTime API (Foot Traffic)](#5-besttime-api-foot-traffic)
6. [Google Popular Times Alternatives](#6-google-popular-times-alternatives)
7. [Menu Data Scraping -- Legal & Ethical](#7-menu-data-scraping--legal--ethical)
8. [DoorDash/UberEats Menu Scraping](#8-doordashuber-eats-menu-scraping)
9. [Claude Vision API (Food Photo Analysis)](#9-claude-vision-api-food-photo-analysis)
10. [Image Optimization & CDN](#10-image-optimization--cdn)
11. [Geocoding API Comparison](#11-geocoding-api-comparison)
12. [Reservation APIs (OpenTable/Resy)](#12-reservation-apis-opentableresy)
13. [Cost Projections Summary](#13-cost-projections-summary)

---

## 1. Google Places API (New)

### Overview

The Google Places API (New) is the primary data source for restaurant discovery. It provides structured data on restaurants including names, addresses, ratings, reviews, photos, opening hours, and -- critically -- **business menu data** via the Place Details endpoint.

### Endpoints & Authentication

| Endpoint | Method | URL |
|---|---|---|
| Nearby Search | POST | `https://places.googleapis.com/v1/places:searchNearby` |
| Text Search | POST | `https://places.googleapis.com/v1/places:searchText` |
| Place Details | GET | `https://places.googleapis.com/v1/places/{place_id}` |
| Place Photos | GET | `https://places.googleapis.com/v1/places/{place_id}/photos/{photo_reference}/media` |
| Autocomplete | POST | `https://places.googleapis.com/v1/places:autocomplete` |

**Authentication:** API key passed via `X-Goog-Api-Key` header. Field mask via `X-Goog-FieldMask` header.

### Pricing (Post-March 2025 Restructure)

Google restructured pricing on March 1, 2025. The old $200/month credit was replaced with per-SKU free usage caps.

| SKU Category | Free Monthly Events | Pay-As-You-Go (per 1,000) |
|---|---|---|
| **Essentials** (basic fields: name, address, ID) | 10,000 | $2 -- $7 |
| **Pro** (reviews, photos, opening hours, Nearby Search) | 5,000 | $17 -- $25 |
| **Enterprise** (atmosphere, menu data, detailed fields) | 1,000 | $25 -- $32 |

**Subscription Plans (enrolled through March 2026):**
| Plan | Monthly Cost | Combined Calls |
|---|---|---|
| Starter | $100/month | 50,000 |
| Essentials | $275/month | 100,000 |
| Pro | $1,200/month | 250,000 |

**Rate Limits:** Up to 100,000 requests/day for standard accounts.

### What Data We CAN Get

- Restaurant name, address, lat/lng, place_id
- Star rating (1-5) and total review count
- Up to 5 review excerpts per place
- Up to 10 photos per place (with photo references for fetching)
- Opening hours (regular and special)
- Price level (0-4 scale)
- Business type/categories
- Website URL and phone number
- **Business menus** (dish names, descriptions, prices) via Place Details with menu field mask
- Dine-in, takeout, delivery booleans
- Wheelchair accessibility

### What Data We CANNOT Get

- Full review text (only excerpts)
- Historical pricing data
- Real-time wait times (no official API)
- Popular Times data (no API -- see Section 6)
- Nutritional information for dishes
- Dish-level photos (only general place photos)
- Reservation availability

### Key Code Snippet (TypeScript)

```typescript
import axios from 'axios';

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY!;

interface NearbySearchParams {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  maxResults?: number;
}

async function searchNearbyRestaurants(params: NearbySearchParams) {
  const response = await axios.post(
    'https://places.googleapis.com/v1/places:searchNearby',
    {
      includedTypes: ['restaurant'],
      maxResultCount: params.maxResults || 20,
      locationRestriction: {
        circle: {
          center: {
            latitude: params.latitude,
            longitude: params.longitude,
          },
          radius: params.radiusMeters,
        },
      },
    },
    {
      headers: {
        'X-Goog-Api-Key': GOOGLE_API_KEY,
        'X-Goog-FieldMask': [
          'places.id',
          'places.displayName',
          'places.formattedAddress',
          'places.location',
          'places.rating',
          'places.userRatingCount',
          'places.priceLevel',
          'places.photos',
          'places.currentOpeningHours',
          'places.dineIn',
          'places.delivery',
          'places.takeout',
        ].join(','),
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data.places;
}

async function getPlaceDetailsWithMenu(placeId: string) {
  const response = await axios.get(
    `https://places.googleapis.com/v1/places/${placeId}`,
    {
      headers: {
        'X-Goog-Api-Key': GOOGLE_API_KEY,
        'X-Goog-FieldMask': [
          'id',
          'displayName',
          'rating',
          'reviews',
          'photos',
          'currentOpeningHours',
          'priceLevel',
          'websiteUri',
          'nationalPhoneNumber',
          // Menu fields (Enterprise SKU)
          'menuForChildren',
          'servesBreakfast',
          'servesLunch',
          'servesDinner',
          'servesBeer',
          'servesWine',
          'servesCocktails',
          'servesVegetarianFood',
        ].join(','),
      },
    }
  );
  return response.data;
}
```

### Gotchas and Limitations

1. **Field mask determines billing tier.** Requesting Pro fields (photos, reviews) on every call costs $17-25/1K instead of $2-7/1K. Always use the minimum fields needed.
2. **Menu data is sparse.** Google's menu data coverage varies significantly by region and restaurant type. Chain restaurants have better coverage. Expect ~30-40% coverage for independent restaurants.
3. **Photo quality varies.** Photos are user-contributed; no guarantee of food-specific photos vs. building exteriors.
4. **Nearby Search returns max 20 results per request.** Use pagination tokens for more.
5. **Reviews are excerpts only.** You get snippets, not full review text. Max 5 reviews per place.
6. **Rate limits can spike during peak hours.** Implement exponential backoff.

### Cost Projections

| Scale | Monthly Requests (est.) | Monthly Cost (Essentials+Pro mix) |
|---|---|---|
| 1K users | ~50,000 | $275 (Essentials plan) |
| 10K users | ~300,000 | $1,200 -- $2,500 |
| 100K users | ~2,000,000 | $8,000 -- $15,000 |

---

## 2. Yelp Fusion API

### Overview

Yelp provides rich review data and business information. For NutriScout, the key value is **review content** that mentions specific dishes and **dish-level metadata** via the Yelp Insights API.

### Endpoints & Authentication

| Endpoint | Method | URL |
|---|---|---|
| Business Search | GET | `https://api.yelp.com/v3/businesses/search` |
| Business Details | GET | `https://api.yelp.com/v3/businesses/{id}` |
| Reviews | GET | `https://api.yelp.com/v3/businesses/{id}/reviews` |
| AI Chat (new) | POST | `https://api.yelp.com/v2/ai/chat` |

**Authentication:** Bearer token via `Authorization: Bearer {API_KEY}` header.

### Pricing (2025-2026)

Yelp sunsetted free commercial API access in 2019. Current pricing:

| Plan | Cost | Rate Limit |
|---|---|---|
| Starter | $7.99 per 1,000 API calls | 500 calls/day |
| Plus | $9.99 per 1,000 API calls | Higher daily limits |
| Enterprise | $14.99 per 1,000 API calls | Custom |
| **Insights API** (dish-level data) | Custom enterprise pricing | Contact sales |

**Daily rate limits:** 500 calls/day for clients created after May 2023 (down from the previous 5,000).

### What Data We CAN Get

- Business name, address, coordinates, phone
- Star rating and review count
- Up to 3 review excerpts per business (Reviews endpoint)
- Photos (up to 3 per business on standard tier)
- Business categories/cuisine types
- Price range ($ to $$$$)
- Hours of operation
- Transaction types (delivery, pickup, restaurant_reservation)
- **Dish-level metadata** (via Insights API -- enterprise only): popular dishes, extracted dish names, drink info

### What Data We CANNOT Get

- Full review text (only excerpts on standard tier)
- Real-time wait times
- Menu prices
- Nutritional information
- Reservation availability (only whether they support reservations)

### Key Code Snippet (TypeScript)

```typescript
import axios from 'axios';

const YELP_API_KEY = process.env.YELP_API_KEY!;
const yelp = axios.create({
  baseURL: 'https://api.yelp.com/v3',
  headers: { Authorization: `Bearer ${YELP_API_KEY}` },
});

async function searchRestaurants(
  latitude: number,
  longitude: number,
  term?: string
) {
  const { data } = await yelp.get('/businesses/search', {
    params: {
      latitude,
      longitude,
      term: term || 'restaurants',
      limit: 50,
      sort_by: 'best_match',
      radius: 5000, // meters
    },
  });
  return data.businesses;
}

async function getBusinessReviews(businessId: string) {
  const { data } = await yelp.get(`/businesses/${businessId}/reviews`, {
    params: { limit: 3, sort_by: 'yelp_sort' },
  });
  return data.reviews; // { id, url, text, rating, time_created, user }
}

// Yelp AI Chat endpoint (for dish-specific queries)
async function askYelpAI(query: string, location: string) {
  const { data } = await axios.post(
    'https://api.yelp.com/v2/ai/chat',
    {
      query, // e.g., "best ramen near me"
      location,
    },
    {
      headers: { Authorization: `Bearer ${YELP_API_KEY}` },
    }
  );
  return data;
}
```

### Gotchas and Limitations

1. **500 calls/day limit is very restrictive.** For any production app, you need a paid plan.
2. **Review excerpts only.** The API returns truncated review text, not full reviews. Display attribution required.
3. **No dish-level data on standard plans.** You must negotiate enterprise Insights API access for dish metadata.
4. **Attribution requirements are strict.** Must display Yelp branding, link back to Yelp, and follow display requirements.
5. **Data caching restrictions.** Yelp TOS limits how long you can cache data (typically 24 hours).
6. **AI Chat endpoint is new and pricing unclear.** Contact Yelp for current costs.

### Cost Projections

| Scale | Monthly Calls (est.) | Monthly Cost |
|---|---|---|
| 1K users | ~30,000 | ~$240 (Starter) |
| 10K users | ~200,000 | ~$1,600 (Plus) |
| 100K users | ~1,500,000 | ~$12,000 -- $22,000 (Enterprise) |

---

## 3. USDA FoodData Central API

### Overview

The USDA FoodData Central (FDC) API is our **primary free nutrition data source**. It provides comprehensive nutrient data for generic foods, branded products, and SR Legacy foods.

### Endpoints & Authentication

Base URL: `https://api.nal.usda.gov/fdc/v1`

| Endpoint | Method | URL |
|---|---|---|
| Food Search | GET | `/foods/search?query={query}&api_key={key}` |
| Food Details | GET | `/food/{fdcId}?api_key={key}` |
| Food List | GET | `/foods/list?api_key={key}` |
| Multiple Foods | POST | `/foods` |

**Authentication:** API key as query parameter `api_key`. Free signup at [fdc.nal.usda.gov/api-key-signup](https://fdc.nal.usda.gov/api-key-signup/).

### Pricing & Rate Limits

| Tier | Cost | Rate Limit |
|---|---|---|
| Standard API key | **FREE** | 1,000 requests/hour per IP |
| DEMO_KEY (testing) | **FREE** | 30 requests/hour, 50/day |
| Higher limits | **FREE** (contact USDA) | Custom (request needed) |

**Exceeding limits:** API key temporarily blocked for 1 hour. No billing -- just throttling.

### Database Contents

| Data Type | Records | Description |
|---|---|---|
| SR Legacy | ~7,800 | USDA Standard Reference -- generic foods |
| Foundation Foods | ~2,300 | Detailed nutrient profiles with metadata |
| Survey (FNDDS) | ~7,000 | Foods from dietary surveys |
| Branded Foods | ~400,000+ | Products with UPC codes |

### What Data We CAN Get

- 150+ nutrients per food item (calories, protein, fat, carbs, fiber, vitamins, minerals)
- Serving sizes and portion weights
- Food categories and descriptions
- Branded product data with UPC barcodes
- Ingredient lists for branded items
- Scientific names and food groups
- Nutrient derivation information

### What Data We CANNOT Get

- Restaurant-specific dish nutrition (no restaurant data)
- Recipe analysis (single ingredients only)
- Allergen information (limited)
- Glycemic index data
- Real-time product availability
- Food photos

### Key Code Snippet (TypeScript)

```typescript
import axios from 'axios';

const USDA_API_KEY = process.env.USDA_API_KEY!;
const USDA_BASE = 'https://api.nal.usda.gov/fdc/v1';

interface NutrientResult {
  fdcId: number;
  description: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  servingSize?: number;
  servingSizeUnit?: string;
}

async function searchFoodNutrients(query: string): Promise<NutrientResult[]> {
  const { data } = await axios.get(`${USDA_BASE}/foods/search`, {
    params: {
      api_key: USDA_API_KEY,
      query,
      dataType: 'SR Legacy,Foundation,Survey (FNDDS)',
      pageSize: 10,
      sortBy: 'dataType.keyword',
      sortOrder: 'asc',
    },
  });

  return data.foods.map((food: any) => {
    const getNutrient = (id: number) =>
      food.foodNutrients?.find((n: any) => n.nutrientId === id)?.value || 0;

    return {
      fdcId: food.fdcId,
      description: food.description,
      calories: getNutrient(1008),  // Energy (kcal)
      protein: getNutrient(1003),   // Protein (g)
      fat: getNutrient(1004),       // Total lipid (g)
      carbs: getNutrient(1005),     // Carbohydrate (g)
      fiber: getNutrient(1079),     // Fiber (g)
      servingSize: food.servingSize,
      servingSizeUnit: food.servingSizeUnit,
    };
  });
}

async function getFoodById(fdcId: number) {
  const { data } = await axios.get(`${USDA_BASE}/food/${fdcId}`, {
    params: {
      api_key: USDA_API_KEY,
      nutrients: '203,204,205,208,291,301,303,304,306,307,318,401',
      // Protein, Fat, Carbs, Energy, Fiber, Ca, Fe, Mg, K, Na, Vit A, Vit C
    },
  });
  return data;
}

// Batch lookup for multiple foods (efficient for recipe analysis)
async function getMultipleFoods(fdcIds: number[]) {
  const { data } = await axios.post(
    `${USDA_BASE}/foods`,
    { fdcIds, nutrients: [203, 204, 205, 208, 291] },
    { params: { api_key: USDA_API_KEY } }
  );
  return data;
}
```

### Best Practices

1. **Cache aggressively.** Nutrient data for generic foods rarely changes. Cache SR Legacy data locally (updated ~annually).
2. **Use Foundation Foods for accuracy.** They have the most detailed nutrient profiles with analytical data.
3. **Batch requests with POST /foods.** Fetch up to 20 foods in one call to save rate limit quota.
4. **Pre-build a local nutrition database.** Download the full dataset CSV from FDC and index it locally. Use the API only for branded product lookups.
5. **Rate limit handling:** Implement a queue with 1-second delays between bursts. 1,000/hour = ~16/minute sustainable.

### Gotchas

1. **No restaurant dish data.** USDA covers raw ingredients and branded products, not "Chicken Pad Thai from Thai Palace."
2. **Search quality is mediocre.** "grilled chicken breast" returns hundreds of variants. You need fuzzy matching logic.
3. **Nutrient IDs are not intuitive.** Must map numeric IDs (1008 = Energy) to human-readable names.
4. **Data quality varies.** Branded food data is often incomplete. Foundation foods are the gold standard.
5. **No webhooks or real-time updates.** Must poll or download bulk data periodically.

### Cost Projections

| Scale | Monthly Requests | Monthly Cost |
|---|---|---|
| 1K users | ~20,000 | **$0** (well within limits) |
| 10K users | ~150,000 | **$0** (may need higher rate limit request) |
| 100K users | ~1,000,000 | **$0** (definitely need higher rate limit; consider local DB) |

---

## 4. Open Food Facts vs Nutritionix API

### Head-to-Head Comparison

| Feature | Open Food Facts | Nutritionix |
|---|---|---|
| **Database size** | 2.8M+ products, 150+ countries | 1.9M+ items (991K grocery, 202K restaurant) |
| **Restaurant menu items** | None | 202,000+ restaurant menu items |
| **Data quality** | Community-sourced, variable | Dietitian-verified, high quality |
| **Pricing** | **FREE** (open source) | Starter: $299/mo, Enterprise: $1,850+/mo |
| **Rate limits** | 100 req/min (respectful use) | Varies by plan |
| **Geographic focus** | Strong in Europe/Latin America | US-focused |
| **Allergen data** | Yes (community-contributed) | Yes (verified) |
| **Barcode/UPC lookup** | Yes | Yes (600K+ UPCs) |
| **NLP food parsing** | No | Yes ("1 cup flour, 1 pinch salt") |
| **Nutri-Score** | Yes | No |
| **Environmental impact** | Yes (Eco-Score) | No |
| **API format** | REST/JSON | REST/JSON |

### Recommendation for NutriScout

**Use BOTH:**
- **Open Food Facts** as a free supplementary source for packaged food data, especially for international products and Nutri-Score/Eco-Score
- **Nutritionix** as the premium source for **restaurant menu item nutrition** (their unique selling point with 202K+ restaurant items)

### Open Food Facts API

**Base URL:** `https://world.openfoodfacts.org/api/v2`

```typescript
// Open Food Facts -- free, no auth required
async function getProductByBarcode(barcode: string) {
  const { data } = await axios.get(
    `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`
  );
  if (data.status === 1) {
    const p = data.product;
    return {
      name: p.product_name,
      brands: p.brands,
      nutriments: {
        calories: p.nutriments['energy-kcal_100g'],
        protein: p.nutriments.proteins_100g,
        fat: p.nutriments.fat_100g,
        carbs: p.nutriments.carbohydrates_100g,
        fiber: p.nutriments.fiber_100g,
        sugar: p.nutriments.sugars_100g,
        sodium: p.nutriments.sodium_100g,
      },
      nutriscore: p.nutriscore_grade, // a, b, c, d, e
      allergens: p.allergens_tags,
      ingredients: p.ingredients_text,
      image: p.image_url,
    };
  }
  return null;
}

// Search foods
async function searchFoods(query: string, page = 1) {
  const { data } = await axios.get(
    'https://world.openfoodfacts.org/cgi/search.pl',
    {
      params: {
        search_terms: query,
        search_simple: 1,
        action: 'process',
        json: 1,
        page,
        page_size: 20,
      },
    }
  );
  return data.products;
}
```

### Nutritionix API

**Base URL:** `https://trackapi.nutritionix.com/v2`

```typescript
const nutritionix = axios.create({
  baseURL: 'https://trackapi.nutritionix.com/v2',
  headers: {
    'x-app-id': process.env.NUTRITIONIX_APP_ID!,
    'x-app-key': process.env.NUTRITIONIX_API_KEY!,
    'Content-Type': 'application/json',
  },
});

// Natural language nutrition lookup (the killer feature)
async function analyzeFood(query: string) {
  const { data } = await nutritionix.post('/natural/nutrients', {
    query, // e.g., "1 large pepperoni pizza from Domino's"
  });
  return data.foods.map((food: any) => ({
    name: food.food_name,
    brandName: food.brand_name,
    servingQty: food.serving_qty,
    servingUnit: food.serving_unit,
    servingWeightGrams: food.serving_weight_grams,
    calories: food.nf_calories,
    protein: food.nf_protein,
    fat: food.nf_total_fat,
    saturatedFat: food.nf_saturated_fat,
    carbs: food.nf_total_carbohydrate,
    fiber: food.nf_dietary_fiber,
    sugar: food.nf_sugars,
    sodium: food.nf_sodium,
    cholesterol: food.nf_cholesterol,
    photo: food.photo?.thumb,
  }));
}

// Search restaurant menu items
async function searchRestaurantItem(query: string, brandId?: string) {
  const { data } = await nutritionix.get('/search/instant', {
    params: {
      query,
      branded: true,
      brand_ids: brandId,
      detailed: true,
    },
  });
  return data.branded; // Restaurant/branded items with full nutrition
}
```

### Nutritionix Pricing Detail

| Plan | Monthly Cost | Includes |
|---|---|---|
| Free (limited) | $0 | No longer publicly available (misuse led to removal) |
| Starter | $299/month | Basic API access |
| Enterprise | $1,850+/month | Full API access, 600K+ UPCs, NLP endpoint |
| Custom | Contact sales | High-volume, dedicated support |

### Cost Projections

| Scale | Open Food Facts | Nutritionix |
|---|---|---|
| 1K users | $0 | $299/mo |
| 10K users | $0 | $1,850/mo |
| 100K users | $0 | $3,000 -- $5,000/mo (negotiated) |

---

## 5. BestTime API (Foot Traffic)

### Overview

BestTime provides relative foot traffic data (0-100%) for public venues in 150+ countries, using anonymous phone signal data. This is our primary source for **wait time estimation** and **busy/quiet period** display.

### Endpoints & Authentication

**Base URL:** `https://besttime.app/api/v1`

| Endpoint | Method | Description |
|---|---|---|
| New Forecast | POST | `/forecasts` -- Generate new foot traffic forecast |
| Query Forecast | GET | `/forecasts/{venue_id}` -- Get existing forecast |
| Live Data | GET | `/forecasts/live/{venue_id}` -- Real-time busyness |
| Venue Search | POST | `/venues/search` -- Search venues with filters |
| Venue Filter | POST | `/venues/filter` -- Filter by busyness |

**Authentication:** API key as query parameter `api_key_private` or `api_key_public`.

### Pricing

BestTime uses a **credit-based** system:

| Plan | Monthly Cost | Credits | Notes |
|---|---|---|---|
| Free Trial | $0 | Limited test credits | Testing only |
| Starter | ~$4.99/mo | Small credit allotment | Basic usage |
| Premium | Custom | Higher credits | ~$0.32 per venue search (20 venues) |
| Enterprise | Custom | Unlimited | Contact sales |

**Credit costs per operation (approximate):**
- New forecast for 1 venue: ~2 credits
- Query existing forecast: ~0.5 credits
- Live busyness check: ~1 credit
- Venue search (20 results): ~16 credits (~$0.32 on Premium)

### Key Code Snippet (TypeScript)

```typescript
const BESTTIME_PRIVATE_KEY = process.env.BESTTIME_API_KEY!;
const BESTTIME_PUBLIC_KEY = process.env.BESTTIME_PUBLIC_KEY!;

// Generate a new foot traffic forecast for a venue
async function createForecast(venueName: string, venueAddress: string) {
  const { data } = await axios.post(
    'https://besttime.app/api/v1/forecasts',
    null,
    {
      params: {
        api_key_private: BESTTIME_PRIVATE_KEY,
        venue_name: venueName,
        venue_address: venueAddress,
      },
    }
  );
  // Returns forecast_id, venue_id, and hourly foot traffic data
  return data;
}

// Get live busyness for a venue (real-time)
async function getLiveBusyness(venueId: string) {
  const { data } = await axios.get(
    `https://besttime.app/api/v1/forecasts/live`,
    {
      params: {
        api_key_public: BESTTIME_PUBLIC_KEY,
        venue_id: venueId,
      },
    }
  );
  // Returns: { venue_live_busyness: 65, venue_live_busyness_available: true }
  return {
    currentBusyness: data.analysis?.venue_live_busyness, // 0-100
    isAvailable: data.analysis?.venue_live_busyness_available,
    forecastedBusyness: data.analysis?.venue_forecasted_busyness,
  };
}

// Search venues with busyness filter
async function searchVenuesByBusyness(
  lat: number,
  lng: number,
  busy_min: number,
  busy_max: number
) {
  const { data } = await axios.post(
    'https://besttime.app/api/v1/venues/filter',
    null,
    {
      params: {
        api_key_private: BESTTIME_PRIVATE_KEY,
        lat,
        lng,
        radius: 2000, // meters
        busy_min,
        busy_max,
        hour: new Date().getHours(),
        day_int: new Date().getDay(),
        venue_filter: 'RESTAURANT',
      },
    }
  );
  return data.venues;
}
```

### Data Format

Forecast response includes hourly busyness for each day of the week:

```json
{
  "analysis": {
    "week_raw": [
      {
        "day_info": { "day_int": 0, "day_text": "Monday" },
        "day_raw": [0, 0, 0, 0, 0, 0, 20, 40, 60, 80, 90, 100, 95, 85, 70, 60, 50, 40, 30, 20, 10, 0, 0, 0],
        "peak_hours": [{ "peak_start": 10, "peak_end": 14, "peak_intensity": 5 }],
        "quiet_hours": [{ "quiet_start": 0, "quiet_end": 6 }],
        "busy_hours": [{ "busy_start": 11, "busy_end": 13 }]
      }
    ]
  }
}
```

### Gotchas

1. **Coverage gaps.** Not all restaurants have foot traffic data, especially smaller/newer establishments.
2. **Relative, not absolute.** Busyness is 0-100 relative to the venue's own peak, not comparable across venues.
3. **Forecasts are averages.** Based on historical patterns, not real-time (use live endpoint for real-time).
4. **Credit consumption adds up fast.** Each new forecast costs credits; cache forecast data aggressively.
5. **Address matching can fail.** The venue matching algorithm may not find the exact restaurant. Use Google Place ID cross-referencing.

### Cost Projections

| Scale | Monthly Forecast Queries | Monthly Cost (est.) |
|---|---|---|
| 1K users | ~5,000 | ~$50 -- $100 |
| 10K users | ~30,000 | ~$300 -- $500 |
| 100K users | ~200,000 | ~$1,500 -- $3,000 (enterprise) |

---

## 6. Google Popular Times Alternatives

### The Problem

**Google does NOT provide an official API for Popular Times data.** Despite years of developer requests (Issue #35827550 on Google's issue tracker), this remains unavailable as of March 2026.

### Available Solutions

#### Option A: BestTime API (Recommended)
See Section 5. This is the cleanest, most legal approach. Uses phone signal aggregation independent of Google.

#### Option B: ScrapingBee Google SERP Scraping
ScrapingBee offers a dedicated Popular Times scraper API.

```typescript
// ScrapingBee approach (extracts from Google SERP)
async function getPopularTimes(placeName: string, location: string) {
  const { data } = await axios.get('https://app.scrapingbee.com/api/v1/', {
    params: {
      api_key: process.env.SCRAPINGBEE_KEY,
      url: `https://www.google.com/maps/search/${encodeURIComponent(placeName + ' ' + location)}`,
      extract_rules: JSON.stringify({
        popular_times: {
          selector: '[aria-label*="Popular times"]',
          type: 'text',
        },
      }),
    },
  });
  return data;
}
```

**Pricing:** ScrapingBee starts at $49/month for 1,000 API credits. Google SERP scraping costs 5-25 credits per request = ~40-200 SERP scrapes per month on the base plan.

#### Option C: Outscraper
Outscraper provides a dedicated Google Maps Popular Times API.

**Pricing:** Starts at $0.002 per result for place data including popular times.

#### Option D: populartimes Python Library (Open Source)
The `populartimes` library on GitHub scrapes Google Maps data. **Warning:** This violates Google's TOS and can result in IP bans. Not recommended for production.

### Recommendation

**Use BestTime API as the primary source** (legal, reliable, API-first). Fall back to ScrapingBee for venues BestTime doesn't cover, but be aware of the TOS risks with Google scraping.

---

## 7. Menu Data Scraping -- Legal & Ethical

### Legal Framework (2025-2026)

#### What IS Legal
- Scraping **publicly accessible data** (visible without login/payment)
- Scraping for **price comparison** and **market research** (protected under fair use in many jurisdictions)
- Accessing data that is **not behind authentication**
- Using data for **non-competing purposes** (e.g., showing nutrition info, not building a competing delivery service)

#### What is NOT Legal / Risky
- Bypassing CAPTCHAs, login walls, or technical protections (violates CFAA in the US)
- Ignoring `robots.txt` disallow directives
- Scraping at rates that degrade the target site's performance (potential tortious interference)
- Republishing copyrighted content (menu descriptions, photos) without transformation
- Scraping PII (personal information of reviewers, etc.)

#### Key Legal Precedents
- **hiQ Labs v. LinkedIn (2022):** Scraping public data is not a CFAA violation
- **Meta v. Bright Data (2024):** Scraping logged-out public data was not unauthorized access
- **Recent 2025-2026 lawsuits around AI training:** New legal boundaries being drawn around scraping for AI model training specifically

### Best Practices for NutriScout

1. **Respect `robots.txt`** on every target domain
2. **Rate limit aggressively** -- max 1 request per second per domain
3. **Cache everything** -- don't re-scrape data that hasn't changed
4. **Transform data** -- extract structured nutrition/price data rather than republishing descriptions verbatim
5. **Attribute sources** -- credit the restaurant/platform where data originated
6. **Provide opt-out** -- let restaurants request removal from NutriScout
7. **Use official APIs first** -- only scrape when no API exists
8. **Consult a lawyer** before production deployment of any scraping pipeline

### Recommended Scraping Tools

| Tool | Language | Best For | Cost |
|---|---|---|---|
| Playwright | Node.js/Python | Dynamic JS-heavy sites (DoorDash, UberEats) | Free (open source) |
| Puppeteer | Node.js | Chrome-specific scraping | Free (open source) |
| Scrapy | Python | High-volume crawling | Free (open source) |
| Cheerio | Node.js | Static HTML parsing | Free (open source) |
| ScrapingBee | API | Anti-bot bypass, proxy rotation | $49+/month |
| Bright Data | API/Proxy | Enterprise-scale scraping | $500+/month |

---

## 8. DoorDash/UberEats Menu Scraping

### Platform Difficulty Assessment

| Platform | Difficulty | Anti-Bot Measures | Notes |
|---|---|---|---|
| Grubhub | Easy | Minimal bot detection | Best target for scraping |
| DoorDash | Medium | React SPA, moderate detection | API calls can be intercepted |
| Uber Eats | Hard | Sophisticated fingerprinting | Aggressive blocking |
| Instacart | Hard | Strong anti-bot | Strict TOS enforcement |

### TOS Violations Warning

**All major delivery platforms explicitly prohibit automated data collection:**
- DoorDash: "You may not use automated means to access or collect data"
- Uber Eats: "You may not use scrapers, robots, or similar automated means"
- Instacart: "You shall not use data mining, robots, or similar data gathering tools"

### DoorDash Scraping Pattern (Playwright)

```typescript
import { chromium, Page } from 'playwright';

interface MenuItem {
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  category: string;
}

async function scrapeDoorDashMenu(storeUrl: string): Promise<MenuItem[]> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();

  // DoorDash loads menu data via internal API calls
  const menuItems: MenuItem[] = [];

  // Intercept API responses for menu data
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/api/v1/store') || url.includes('menu')) {
      try {
        const json = await response.json();
        // Parse menu items from the response
        if (json?.menuCategories) {
          for (const category of json.menuCategories) {
            for (const item of category.items || []) {
              menuItems.push({
                name: item.name,
                description: item.description || '',
                price: item.price / 100, // Price in cents
                imageUrl: item.imageUrl,
                category: category.name,
              });
            }
          }
        }
      } catch (e) {
        // Not a JSON response, skip
      }
    }
  });

  await page.goto(storeUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000); // Wait for dynamic content

  await browser.close();
  return menuItems;
}
```

### Better Alternative: Third-Party Menu Data Services

Instead of scraping directly (and risking legal issues), consider these menu data aggregators:

| Service | Data Coverage | Pricing | Notes |
|---|---|---|---|
| **Foodspark** | DoorDash, UberEats, Grubhub | Custom pricing | Dedicated food data scraping service |
| **Apify** | DoorDash, UberEats scrapers | $49+/month | Pre-built actors for food platforms |
| **Real Data API** | UberEats, DoorDash | Custom | Structured menu data extraction |
| **FoodDataScrape** | Multiple platforms | Custom | Dedicated to food delivery data |

### Infrastructure Costs for DIY Scraping

| Component | Monthly Cost |
|---|---|
| Proxy rotation service | $50 -- $200 |
| Cloud compute (scraper instances) | $50 -- $100 |
| Anti-detect browser service | $50 -- $100 |
| **Total DIY** | **$150 -- $400/month** |

---

## 9. Claude Vision API (Food Photo Analysis)

### Overview

Claude's vision capabilities allow NutriScout to **analyze food photos and estimate macronutrients** from images. This is a core feature: users photograph their dish and get approximate nutrition data.

### How Image Tokens Are Calculated

**Formula:** `tokens = (width_px * height_px) / 750`

| Image Size | Tokens | Cost (Haiku 4.5) | Cost (Sonnet 4.6) |
|---|---|---|---|
| 200 x 200 | ~53 | $0.000053 | $0.000159 |
| 400 x 400 | ~213 | $0.000213 | $0.000639 |
| 800 x 800 | ~853 | $0.000853 | $0.002559 |
| 1000 x 1000 | ~1,333 | $0.001333 | $0.003999 |
| 1568 x 1568 (max) | ~3,275 | $0.003275 | $0.009825 |

**Note:** Images larger than 1568px on the long edge are automatically resized down.

### Pricing Summary

| Model | Input (per MTok) | Output (per MTok) | Batch Input | Batch Output |
|---|---|---|---|---|
| **Haiku 4.5** (recommended for production) | $1 | $5 | $0.50 | $2.50 |
| **Sonnet 4.6** (higher accuracy) | $3 | $15 | $1.50 | $7.50 |
| **Opus 4.6** (maximum accuracy) | $5 | $25 | $2.50 | $12.50 |

### Cost Optimization Strategies

1. **Prompt caching:** Cache the system prompt (nutrition analysis instructions). Saves 90% on system prompt tokens after first request. Cache hit = 0.1x base price.
2. **Batch API:** For non-real-time analysis, use batch processing for 50% discount.
3. **Combine caching + batch:** Up to 95% savings.
4. **Resize images client-side:** Send 800x800 images (853 tokens) instead of full-resolution. Good enough for food analysis.
5. **Use Haiku 4.5 for initial screening,** Sonnet for detailed analysis only when requested.

### Key Code Snippet (TypeScript)

```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface NutritionEstimate {
  dishName: string;
  confidence: 'low' | 'medium' | 'high';
  servingSize: string;
  calories: { min: number; max: number; estimate: number };
  protein: { min: number; max: number; estimate: number };
  carbs: { min: number; max: number; estimate: number };
  fat: { min: number; max: number; estimate: number };
  fiber: { min: number; max: number; estimate: number };
  ingredients: string[];
}

async function analyzeFood Photo(
  imageBase64: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp'
): Promise<NutritionEstimate> {
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20250901', // Cost-effective for food analysis
    max_tokens: 1024,
    system: `You are a nutrition analysis expert. Analyze the food photo and estimate macronutrients. Always provide ranges (min/max) and a best estimate. Consider portion size visible in the image. Return JSON only.`,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType,
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: 'Analyze this food photo. Identify the dish, estimate portion size, and provide macronutrient estimates. Return as JSON with fields: dishName, confidence, servingSize, calories{min,max,estimate}, protein{min,max,estimate}, carbs{min,max,estimate}, fat{min,max,estimate}, fiber{min,max,estimate}, ingredients[].',
          },
        ],
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  return JSON.parse(text);
}

// With prompt caching for high-volume usage
async function analyzeFoodPhotoCached(
  imageBase64: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp'
) {
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20250901',
    max_tokens: 1024,
    system: [
      {
        type: 'text',
        text: `You are a nutrition analysis expert. Analyze the food photo and estimate macronutrients. Always provide ranges (min/max) and a best estimate. Consider portion size visible in the image. Use USDA standard reference data for nutrient values. Return JSON only with fields: dishName, confidence, servingSize, calories{min,max,estimate}, protein{min,max,estimate}, carbs{min,max,estimate}, fat{min,max,estimate}, fiber{min,max,estimate}, ingredients[].`,
        cache_control: { type: 'ephemeral' }, // Cache this system prompt
      },
    ],
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mimeType, data: imageBase64 },
          },
          { type: 'text', text: 'Analyze this food photo.' },
        ],
      },
    ],
  });

  return response;
}
```

### Per-Analysis Cost Breakdown

Assuming 800x800 food photo, ~200 output tokens for JSON response:

| Model | Image Input | Text Input (~150 tok) | Output (~200 tok) | Total per Analysis |
|---|---|---|---|---|
| Haiku 4.5 | $0.000853 | $0.000150 | $0.001000 | **$0.002003** |
| Haiku 4.5 + cache | $0.000853 | $0.000015 | $0.001000 | **$0.001868** |
| Haiku 4.5 + batch | $0.000427 | $0.000075 | $0.000500 | **$0.001002** |
| Sonnet 4.6 | $0.002559 | $0.000450 | $0.003000 | **$0.006009** |

### Cost Projections (Food Photo Analysis)

Assuming 3 photo analyses per user per day, 20% of users active daily:

| Scale | Daily Analyses | Monthly Cost (Haiku+cache) | Monthly Cost (Sonnet) |
|---|---|---|---|
| 1K users | 600 | **$34** | $108 |
| 10K users | 6,000 | **$336** | $1,082 |
| 100K users | 60,000 | **$3,361** | $10,816 |

---

## 10. Image Optimization & CDN

### Strategy for NutriScout Food Photos

Food photos are the **most bandwidth-intensive asset** in NutriScout. Optimizing delivery directly impacts load times, user experience, and hosting costs.

### Recommended Stack

**Next.js `<Image>` component + Cloudinary CDN**

### Next.js Image Optimization (Built-in)

```typescript
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.googleusercontent.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 's3-media*.yelpcdn.com' },
    ],
    formats: ['image/avif', 'image/webp'], // Modern formats
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },
};

export default nextConfig;
```

```tsx
// components/FoodImage.tsx
import Image from 'next/image';

interface FoodImageProps {
  src: string;
  alt: string;
  priority?: boolean;
}

export function FoodImage({ src, alt, priority = false }: FoodImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      width={400}
      height={300}
      priority={priority} // For above-fold LCP images
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ..." // Low-quality placeholder
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      style={{ objectFit: 'cover' }}
      quality={75} // Good balance for food photos
    />
  );
}
```

### Cloudinary Integration

```typescript
// lib/cloudinary.ts
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Generate optimized food photo URL
function getFoodPhotoUrl(
  publicId: string,
  options: { width?: number; height?: number; quality?: string } = {}
) {
  return cloudinary.url(publicId, {
    transformation: [
      {
        width: options.width || 800,
        height: options.height || 600,
        crop: 'fill',
        gravity: 'auto', // AI-based smart cropping
        quality: options.quality || 'auto:good',
        format: 'auto', // Auto-select webp/avif
        fetch_format: 'auto',
      },
    ],
    secure: true,
  });
}

// Upload user food photo with optimization
async function uploadFoodPhoto(filePath: string, dishName: string) {
  const result = await cloudinary.uploader.upload(filePath, {
    folder: 'nutriscout/food-photos',
    public_id: `${dishName}-${Date.now()}`,
    transformation: [
      { width: 1200, height: 900, crop: 'limit' }, // Max dimensions
      { quality: 'auto:good', format: 'auto' },
    ],
    eager: [
      { width: 400, height: 300, crop: 'fill', gravity: 'auto' }, // Thumbnail
      { width: 800, height: 600, crop: 'fill', gravity: 'auto' }, // Card
    ],
    eager_async: true,
  });
  return result;
}
```

### Cloudinary Pricing

| Plan | Monthly Cost | Includes |
|---|---|---|
| Free | $0 | 25 credits (25K transforms OR 25GB storage OR 25GB bandwidth) |
| Plus | $89/month | 225 credits |
| Advanced | $224/month | 600 credits |
| Enterprise | Custom | Unlimited |

**1 credit = 1,000 transformations = 1 GB storage = 1 GB bandwidth**

### Alternative: Imgix

If Cloudinary gets expensive at scale, Imgix is an alternative with simpler pricing:
- **$100/month** base + $0.08 per 1,000 master images + $3 per 1,000 GB CDN bandwidth

### Cost Projections (Cloudinary)

| Scale | Storage | Bandwidth/mo | Monthly Cost |
|---|---|---|---|
| 1K users | 2 GB | 20 GB | **$0** (Free tier) |
| 10K users | 15 GB | 150 GB | **$89 -- $224** (Plus/Advanced) |
| 100K users | 100 GB | 1.5 TB | **$500 -- $1,500** (Enterprise) |

---

## 11. Geocoding API Comparison

### Head-to-Head Comparison

| Feature | Google Maps | Mapbox | Radar.io | Nominatim (OSM) |
|---|---|---|---|---|
| **Free tier** | 10K events/mo | 100K requests/mo | 100K requests/mo | Unlimited (self-host) |
| **Geocoding cost** | $5/1K requests | $0.75/1K requests | $0.50/1K requests | Free |
| **Autocomplete cost** | $2.83/1K | $0.75/1K | $0.50/1K | Free |
| **Places search cost** | $17-32/1K | $5/1K | $2/1K | Free |
| **Global coverage** | 99%+ roads | Good (OSM-based) | Good (OSM-based) | Variable |
| **Data quality** | Best | Very good | Very good | Variable by region |
| **Reverse geocoding** | $5/1K | $0.75/1K | $0.50/1K | Free |
| **Map tiles** | $7/1K loads | 50K free/mo | Included | Self-host |

### Recommendation for NutriScout

**Primary: Radar.io** -- Best value, 90% cheaper than Google, excellent quality for US-focused apps.

**Fallback: Mapbox** -- More established, larger free tier for geocoding specifically.

**Avoid Google for geocoding** -- Use Google only for Places data (restaurant search), not for basic geocoding.

### Radar.io Integration

```typescript
import Radar from '@radarlabs/radar';

Radar.initialize(process.env.RADAR_PUBLISHABLE_KEY!);

// Server-side geocoding
async function geocodeAddress(address: string) {
  const response = await fetch(
    `https://api.radar.io/v1/geocode/forward?query=${encodeURIComponent(address)}`,
    {
      headers: { Authorization: process.env.RADAR_SECRET_KEY! },
    }
  );
  const data = await response.json();
  return data.addresses[0]; // { latitude, longitude, formattedAddress, ... }
}

// Reverse geocode (coordinates to address)
async function reverseGeocode(lat: number, lng: number) {
  const response = await fetch(
    `https://api.radar.io/v1/geocode/reverse?coordinates=${lat},${lng}`,
    {
      headers: { Authorization: process.env.RADAR_SECRET_KEY! },
    }
  );
  const data = await response.json();
  return data.addresses[0];
}

// Autocomplete for search bar
async function autocompleteAddress(query: string, lat?: number, lng?: number) {
  const params = new URLSearchParams({ query });
  if (lat && lng) {
    params.set('near', `${lat},${lng}`);
  }
  const response = await fetch(
    `https://api.radar.io/v1/search/autocomplete?${params}`,
    {
      headers: { Authorization: process.env.RADAR_SECRET_KEY! },
    }
  );
  const data = await response.json();
  return data.addresses;
}
```

### Cost Projections (Geocoding)

| Scale | Monthly Requests | Google | Mapbox | Radar.io |
|---|---|---|---|---|
| 1K users | ~20,000 | $100 | $0 (free tier) | $0 (free tier) |
| 10K users | ~150,000 | $750 | $37.50 | $25 |
| 100K users | ~1,000,000 | $5,000 | $450 | $250 |

---

## 12. Reservation APIs (OpenTable/Resy)

### OpenTable API

#### Access Requirements

OpenTable does NOT offer a public self-service API. You must:
1. Apply as a **partner** via [opentable.com/restaurant-solutions/api-partners/become-a-partner](https://www.opentable.com/restaurant-solutions/api-partners/become-a-partner/)
2. Complete their partner application and review process
3. Get approved and receive sandbox credentials
4. Build and test in their pre-production environment
5. Pass their review before going to production

**Contact:** busdev@opentable.com

#### What the API Offers (for approved partners)

- Real-time table availability
- Booking/reservation creation
- Booking management (modify/cancel)
- Guest and reservation data
- Restaurant availability widgets

#### Integration Approach

For NutriScout without full partner status, use the **OpenTable widget/deeplink** approach:

```typescript
// Simple deeplink approach (no API partnership required)
function getOpenTableBookingUrl(restaurantId: string, partySize: number, date: string) {
  return `https://www.opentable.com/restref/client/?rid=${restaurantId}&restref=${restaurantId}&partysize=${partySize}&datetime=${date}&lang=en-US`;
}

// Alternatively, use their booking widget embed
function getOpenTableWidget(restaurantId: string) {
  return `<script type="text/javascript" src="https://www.opentable.com/widget/reservation/loader?rid=${restaurantId}&type=standard&theme=standard&overlay=false&domain=com&lang=en-US"></script>`;
}
```

### Resy API

#### Access

Resy does NOT have a public developer API. Their integration is focused on:
- POS system integrations (Toast, Square, etc.)
- Internal ResyOS tools for restaurant operators
- No third-party reservation booking API

#### Reverse-Engineered API (Unofficial)

Some developers have reverse-engineered Resy's internal API:

```typescript
// WARNING: Unofficial, may break at any time, violates TOS
const RESY_API_URL = 'https://api.resy.com';

async function findResyAvailability(
  venueId: string,
  date: string, // YYYY-MM-DD
  partySize: number
) {
  const response = await fetch(
    `${RESY_API_URL}/4/find?lat=0&long=0&day=${date}&party_size=${partySize}&venue_id=${venueId}`,
    {
      headers: {
        Authorization: `ResyAPI api_key="${process.env.RESY_API_KEY}"`,
        'X-Resy-Auth-Token': process.env.RESY_AUTH_TOKEN!,
      },
    }
  );
  const data = await response.json();
  return data.results?.venues?.[0]?.slots; // Available time slots
}
```

### Recommendation for NutriScout

1. **Apply for OpenTable partner status** early -- approval takes weeks/months
2. **Use deeplinks/widgets** for initial MVP (no API access needed)
3. **Do not use unofficial Resy API** in production -- too fragile and risky
4. **Consider showing "Reserve on OpenTable/Resy" buttons** that link out to native apps
5. **Monitor for official Resy developer program** announcements

### Cost

- OpenTable partner API: **Free** (revenue share model -- OpenTable charges restaurants, not API partners)
- Resy: **N/A** (no official API)
- Deeplink approach: **$0**

---

## 13. Cost Projections Summary

### Monthly Cost by Scale (All Services Combined)

| Service | 1K Users | 10K Users | 100K Users |
|---|---|---|---|
| Google Places API | $275 | $1,500 | $10,000 |
| Yelp Fusion API | $240 | $1,600 | $15,000 |
| USDA FoodData Central | $0 | $0 | $0 |
| Open Food Facts | $0 | $0 | $0 |
| Nutritionix | $299 | $1,850 | $3,500 |
| BestTime API | $75 | $400 | $2,000 |
| Claude Vision (Haiku) | $34 | $336 | $3,361 |
| Cloudinary CDN | $0 | $150 | $1,000 |
| Radar.io (Geocoding) | $0 | $25 | $250 |
| Menu scraping infra | $150 | $300 | $500 |
| OpenTable/Resy | $0 | $0 | $0 |
| **TOTAL** | **$1,073** | **$6,161** | **$35,611** |

### Cost Optimization Strategies

1. **Aggressive caching** -- Cache restaurant data (24hr), nutrition data (permanent), geocoding results (permanent). Can reduce API calls by 60-80%.
2. **Tiered model usage** -- Use Haiku for routine food analysis, Sonnet only for complex/ambiguous photos.
3. **Batch processing** -- Use Claude Batch API for non-real-time nutrition analysis (50% off).
4. **Local nutrition DB** -- Download USDA bulk data, reducing API calls to near zero.
5. **Smart field masks** -- Only request Pro/Enterprise Google fields when user drills into details, not on list views.
6. **Pre-compute popular venues** -- Run BestTime forecasts on popular restaurants overnight, serve from cache during the day.

### Optimized Cost Projection (with caching + smart architecture)

| Scale | Naive Cost | Optimized Cost | Savings |
|---|---|---|---|
| 1K users | $1,073/mo | ~$500/mo | 53% |
| 10K users | $6,161/mo | ~$2,500/mo | 59% |
| 100K users | $35,611/mo | ~$12,000/mo | 66% |

---

## Sources

- [Google Places API Overview](https://developers.google.com/maps/documentation/places/web-service/op-overview)
- [Google Places API Pricing](https://developers.google.com/maps/documentation/places/web-service/usage-and-billing)
- [Google Maps Platform Pricing 2026](https://nicolalazzari.ai/articles/understanding-google-maps-apis-a-comprehensive-guide-to-uses-and-costs)
- [Google Maps March 2025 Changes](https://developers.google.com/maps/billing-and-pricing/march-2025)
- [Yelp Fusion API Docs](https://docs.developer.yelp.com/docs/places-intro)
- [Yelp Pricing](https://business.yelp.com/data/resources/pricing/)
- [Yelp Fusion API Pricing Controversy](https://techcrunch.com/2024/08/02/yelps-lack-of-transparency-around-api-charges-angers-developers/)
- [USDA FoodData Central API Guide](https://fdc.nal.usda.gov/api-guide/)
- [Top Nutrition APIs 2026](https://www.spikeapi.com/blog/top-nutrition-apis-for-developers-2026)
- [Nutritionix API](https://www.nutritionix.com/api)
- [Open Food Facts API](https://world.openfoodfacts.org/data)
- [BestTime API Documentation](https://documentation.besttime.app/)
- [BestTime Pricing](https://besttime.app/subscription/pricing)
- [Google Popular Times Issue Tracker](https://issuetracker.google.com/issues/35827550)
- [ScrapingBee Google Popular Times](https://www.scrapingbee.com/scrapers/google-popular-times-scraper-api/)
- [Web Scraping Legal Guide 2025](https://www.browserless.io/blog/is-web-scraping-legal)
- [Web Scraping Laws 2026](https://www.datadwip.com/blog/web-scraping-laws-and-ethics/)
- [Food Delivery Scraping Guide](https://www.plottdata.com/blogs/scrape-food-delivery-data)
- [Claude API Pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- [Claude Vision Docs](https://platform.claude.com/docs/en/build-with-claude/vision)
- [Next.js Image Optimization](https://nextjs.org/docs/app/getting-started/images)
- [Cloudinary Pricing](https://cloudinary.com/pricing)
- [Mapbox Pricing](https://www.mapbox.com/pricing)
- [Radar.io vs Google Maps](https://radar.com/blog/google-maps-api-cost)
- [Radar Geocoding API](https://radar.com/product/geocoding-api)
- [OpenTable API Partners](https://www.opentable.com/restaurant-solutions/api-partners/)
- [OpenTable API Docs](https://docs.opentable.com/)
- [Resy API Reverse Engineering](https://jonluca.substack.com/p/resy-api)
