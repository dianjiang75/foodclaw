/**
 * End-to-end integration tests for FoodClaw.
 * These test the full API flow with mocked database layer.
 */

// Mock Prisma before any imports
const mockDishes = [
  {
    id: "d1",
    name: "Grilled Chicken Breast",
    description: "Herb-marinated chicken with quinoa",
    price: 16.95,
    category: "Mains",
    restaurantId: "r1",
    ingredientsRaw: "chicken, quinoa, broccoli",
    ingredientsParsed: [{ name: "chicken", is_primary: true }],
    dietaryFlags: { vegan: false, vegetarian: false, gluten_free: true, dairy_free: true, nut_free: true },
    dietaryConfidence: 0.88,
    caloriesMin: 420,
    caloriesMax: 520,
    proteinMinG: 42,
    proteinMaxG: 52,
    carbsMinG: 28,
    carbsMaxG: 38,
    fatMinG: 14,
    fatMaxG: 20,
    macroConfidence: 0.88,
    macroSource: "vision_ai",
    photoCountAnalyzed: 7,
    isAvailable: true,
    restaurant: { id: "r1", name: "Green Leaf Cafe", address: "123 Main St", googleRating: 4.7 },
    reviewSummary: {
      averageDishRating: 4.5,
      summaryText: "Well-loved for freshness and generous protein.",
      totalReviewsAnalyzed: 32,
      commonPraises: ["generous portions", "fresh ingredients"],
      commonComplaints: [],
    },
    photos: [{ id: "p1", sourceUrl: "https://img.example.com/1.jpg", sourcePlatform: "google_maps", macroEstimate: { calories: 470 } }],
  },
  {
    id: "d2",
    name: "Falafel Plate",
    description: "Crispy chickpea falafel with hummus and pita",
    price: 13.95,
    category: "Mains",
    restaurantId: "r2",
    ingredientsRaw: "chickpeas, hummus, pita",
    ingredientsParsed: [{ name: "chickpeas", is_primary: true }],
    dietaryFlags: { vegan: true, vegetarian: true, gluten_free: false, dairy_free: true, nut_free: true },
    dietaryConfidence: 0.86,
    caloriesMin: 520,
    caloriesMax: 640,
    proteinMinG: 18,
    proteinMaxG: 24,
    carbsMinG: 58,
    carbsMaxG: 70,
    fatMinG: 24,
    fatMaxG: 32,
    macroConfidence: 0.86,
    macroSource: "vision_ai",
    photoCountAnalyzed: 7,
    isAvailable: true,
    restaurant: { id: "r2", name: "Olive & Vine", address: "456 2nd Ave", googleRating: 4.5 },
    reviewSummary: null,
    photos: [],
  },
  {
    id: "d3",
    name: "Chicken Tikka Masala",
    description: "Creamy tomato-spiced sauce with tender chicken",
    price: 15.95,
    category: "Mains",
    restaurantId: "r3",
    ingredientsRaw: "chicken, tomatoes, cream, garam masala",
    ingredientsParsed: [{ name: "chicken", is_primary: true }],
    dietaryFlags: { vegan: false, vegetarian: false, gluten_free: true, dairy_free: false, nut_free: true },
    dietaryConfidence: 0.85,
    caloriesMin: 480,
    caloriesMax: 580,
    proteinMinG: 32,
    proteinMaxG: 40,
    carbsMinG: 18,
    carbsMaxG: 26,
    fatMinG: 28,
    fatMaxG: 36,
    macroConfidence: 0.85,
    macroSource: "vision_ai",
    photoCountAnalyzed: 9,
    isAvailable: true,
    restaurant: { id: "r3", name: "Spice Route", address: "789 Ave A", googleRating: 4.6 },
    reviewSummary: {
      averageDishRating: 4.3,
      summaryText: "A crowd favorite with rich, creamy sauce.",
      totalReviewsAnalyzed: 28,
      commonPraises: ["great flavor", "authentic taste"],
      commonComplaints: ["can be spicy"],
    },
    photos: [],
  },
  {
    id: "d4",
    name: "Classic Cheeseburger",
    description: "Angus beef with cheddar on brioche bun",
    price: 14.95,
    category: "Mains",
    restaurantId: "r4",
    ingredientsRaw: "beef, cheddar, brioche bun",
    ingredientsParsed: [{ name: "beef", is_primary: true }],
    dietaryFlags: { vegan: false, vegetarian: false, gluten_free: false, dairy_free: false, nut_free: true },
    dietaryConfidence: 0.85,
    caloriesMin: 650,
    caloriesMax: 780,
    proteinMinG: 38,
    proteinMaxG: 46,
    carbsMinG: 38,
    carbsMaxG: 48,
    fatMinG: 35,
    fatMaxG: 45,
    macroConfidence: 0.85,
    macroSource: "vision_ai",
    photoCountAnalyzed: 8,
    isAvailable: true,
    restaurant: { id: "r4", name: "The Burger Joint", address: "100 E 7th St", googleRating: 4.1 },
    reviewSummary: null,
    photos: [],
  },
];

jest.mock("@/lib/middleware/rate-limiter", () => ({
  checkApiRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 99, retryAfterSeconds: null }),
}));

jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("$2a$12$hashedpassword"),
  compare: jest.fn().mockResolvedValue(true),
}));

jest.mock("@/lib/db/client", () => ({
  prisma: {
    userProfile: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    dish: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    dishPhoto: {
      findMany: jest.fn(),
    },
    restaurantLogistics: {
      findUnique: jest.fn(),
    },
    communityFeedback: {
      create: jest.fn(),
    },
  },
}));

jest.mock("@/lib/orchestrator", () => ({
  search: jest.fn(),
}));

jest.mock("@/lib/similarity", () => ({
  findSimilarDishes: jest.fn(),
}));

import { prisma } from "@/lib/db/client";
import { search } from "@/lib/orchestrator";
import { signToken } from "@/lib/auth/jwt";
import { POST as register } from "@/app/api/auth/register/route";
import { POST as login } from "@/app/api/auth/login/route";
import { PATCH as updateProfile } from "@/app/api/users/profile/route";
import { GET as searchDishes } from "@/app/api/search/route";
import { GET as getDish } from "@/app/api/dishes/[id]/route";
import { GET as getTraffic } from "@/app/api/restaurants/[id]/traffic/route";
import { GET as getSimilar } from "@/app/api/dishes/[id]/similar/route";
import { POST as submitFeedback } from "@/app/api/feedback/route";
import { findSimilarDishes } from "@/lib/similarity";

function jsonReq(body: unknown, token?: string): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return new Request("http://localhost", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

// Use proper UUIDs for params since routes validate UUID format
const DISH_UUID = "11111111-1111-4111-8111-111111111111";
const DISH_UUID2 = "22222222-2222-4222-8222-222222222222";
const RESTAURANT_UUID = "aaaa1111-1111-4111-8111-111111111111";

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("E2E: User creates profile and searches for dishes", () => {
  beforeEach(() => jest.clearAllMocks());

  it("registers a vegan user with password", async () => {
    (prisma.userProfile.create as jest.Mock).mockResolvedValue({
      id: "u1", email: "test@vegan.com", name: "Vegan User",
    });

    const res = await register(jsonReq({
      email: "test@vegan.com",
      name: "Vegan User",
      password: "secret123",
      dietary_restrictions: { vegan: true },
      nutritional_goals: { priority: "max_protein" },
    }));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.token).toBeDefined();
    expect(body.data.user.id).toBe("u1");
  });

  it("logs in with password and retrieves token", async () => {
    (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue({
      id: "u1", email: "test@vegan.com", name: "Vegan User",
      passwordHash: "$2a$12$hashedpassword",
      dietaryRestrictions: { vegan: true },
      nutritionalGoals: { priority: "max_protein" },
    });

    const res = await login(jsonReq({ email: "test@vegan.com", password: "secret123" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.token).toBeDefined();
    expect(body.data.user.dietary_restrictions.vegan).toBe(true);
  });

  it("updates max wait time and search radius with JWT auth", async () => {
    (prisma.userProfile.update as jest.Mock).mockResolvedValue({
      id: "u1",
      dietaryRestrictions: { vegan: true },
      nutritionalGoals: { priority: "max_protein" },
      maxWaitMinutes: 20,
      searchRadiusMiles: 1.5,
    });

    const token = await signToken({ sub: "u1", email: "test@vegan.com", name: "Vegan User" });
    const req = new Request("http://localhost/api/users/profile", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ max_wait_minutes: 20, search_radius_miles: 1.5 }),
    });

    const res = await updateProfile(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.max_wait_minutes).toBe(20);
    expect(body.data.search_radius_miles).toBe(1.5);
  });
});

describe("E2E: Vegan user search returns only vegan dishes sorted by protein", () => {
  beforeEach(() => jest.clearAllMocks());

  it("filters for vegan dishes and sorts by protein via orchestrator", async () => {
    const veganDishes = mockDishes.filter((d) =>
      d.dietaryFlags.vegan === true
    ).sort((a, b) => (b.proteinMaxG ?? 0) - (a.proteinMaxG ?? 0));

    (search as jest.Mock).mockResolvedValue({
      dishes: veganDishes.map((d) => ({
        id: d.id,
        name: d.name,
        restaurant_name: d.restaurant.name,
        macros: {
          calories: { min: d.caloriesMin, max: d.caloriesMax },
          protein_g: { min: d.proteinMinG, max: d.proteinMaxG },
          carbs_g: { min: d.carbsMinG, max: d.carbsMaxG },
          fat_g: { min: d.fatMinG, max: d.fatMaxG },
        },
        macro_confidence: d.macroConfidence,
        rating: d.reviewSummary?.averageDishRating ?? null,
      })),
      total: veganDishes.length,
      cached: false,
    });

    const url = "http://localhost/api/search?lat=40.7264&lng=-73.9878&diet=vegan&goal=max_protein&sort=macro_match";
    const res = await searchDishes(new Request(url));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.dishes.length).toBe(1);
    expect(body.data.dishes[0].name).toBe("Falafel Plate");
  });
});

describe("E2E: User clicks a dish and sees full detail", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns dish with macros, reviews, and restaurant info", async () => {
    const d = { ...mockDishes[0], id: DISH_UUID }; // Grilled Chicken Breast
    (prisma.dish.findUnique as jest.Mock).mockResolvedValue(d);

    const res = await getDish(new Request("http://localhost"), makeParams(DISH_UUID));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.name).toBe("Grilled Chicken Breast");
    expect(body.data.macros.calories).toEqual({ min: 420, max: 520 });
    expect(body.data.macros.protein_g).toEqual({ min: 42, max: 52 });
    expect(body.data.restaurant.name).toBe("Green Leaf Cafe");
    expect(body.data.review_summary.praises).toContain("generous portions");
    expect(body.data.photos.length).toBe(1);
  });
});

describe("E2E: Long wait triggers similar dishes recommendation", () => {
  beforeEach(() => jest.clearAllMocks());

  it("restaurant with 45 min wait shows alternatives", async () => {
    (prisma.restaurantLogistics.findUnique as jest.Mock).mockResolvedValue({
      typicalBusynessPct: 90,
      updatedAt: new Date(),
    });

    const res = await getTraffic(new Request("http://localhost"), makeParams(RESTAURANT_UUID));
    const body = await res.json();

    expect(body.data.data_available).toBe(true);
    expect(body.data.busyness_pct).toBe(90);
    expect(body.data.estimated_wait_minutes).toBeGreaterThan(20);

    // User should then see similar dishes
    (findSimilarDishes as jest.Mock).mockResolvedValue([
      { id: "d2", name: "Falafel Plate", similarity: 0.85 },
      { id: "d3", name: "Chicken Tikka Masala", similarity: 0.78 },
    ]);

    const simRes = await getSimilar(
      new Request(`http://localhost/api/dishes/${DISH_UUID}/similar?lat=40.7264&lng=-73.9878&limit=4`),
      makeParams(DISH_UUID)
    );
    const simBody = await simRes.json();

    expect(simBody.data.dishes.length).toBe(2);
    expect(simBody.data.dishes[0].name).toBe("Falafel Plate");
  });
});

describe("E2E: Search with no dietary restrictions returns all dishes", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns all dishes when no diet filter applied", async () => {
    (search as jest.Mock).mockResolvedValue({
      dishes: mockDishes.map((d) => ({
        id: d.id,
        name: d.name,
        restaurant_name: d.restaurant.name,
        macros: {
          calories: { min: d.caloriesMin, max: d.caloriesMax },
          protein_g: { min: d.proteinMinG, max: d.proteinMaxG },
        },
      })),
      total: mockDishes.length,
      cached: false,
    });

    const res = await searchDishes(
      new Request("http://localhost/api/search?lat=40.7264&lng=-73.9878")
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.dishes.length).toBe(4);
  });
});

describe("E2E: Search with calorie limit filters results", () => {
  beforeEach(() => jest.clearAllMocks());

  it("passes calorie_limit to orchestrator", async () => {
    (search as jest.Mock).mockResolvedValue({
      dishes: mockDishes
        .filter((d) => (d.caloriesMax ?? Infinity) <= 600)
        .map((d) => ({ id: d.id, name: d.name })),
      total: 2,
      cached: false,
    });

    const res = await searchDishes(
      new Request("http://localhost/api/search?lat=40.7264&lng=-73.9878&calorie_limit=600")
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({ calorie_limit: 600 })
    );
    expect(body.data.dishes.length).toBe(2);
  });
});

describe("E2E: Community feedback submission", () => {
  beforeEach(() => jest.clearAllMocks());

  it("submits portion feedback for a dish", async () => {
    (prisma.communityFeedback.create as jest.Mock).mockResolvedValue({ id: "fb1" });

    const res = await submitFeedback(jsonReq({
      dish_id: DISH_UUID,
      user_id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
      feedback_type: "portion_bigger",
      details: "Portion was much larger than expected",
    }));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.id).toBe("fb1");
  });
});
