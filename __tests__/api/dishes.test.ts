jest.mock("@/lib/db/client", () => ({
  prisma: {
    dish: { findUnique: jest.fn(), findMany: jest.fn() },
    dishPhoto: { findMany: jest.fn() },
  },
}));

jest.mock("@/lib/similarity", () => ({
  findSimilarDishes: jest.fn(),
}));

import { GET as getDish } from "@/app/api/dishes/[id]/route";
import { GET as getSimilar } from "@/app/api/dishes/[id]/similar/route";
import { GET as getPhotos } from "@/app/api/dishes/[id]/photos/route";
import { prisma } from "@/lib/db/client";
import { findSimilarDishes } from "@/lib/similarity";

const mockDish = {
  id: "d1",
  name: "Pad Thai",
  description: "Classic Thai noodles",
  price: 12.5,
  category: "Mains",
  ingredientsRaw: "noodles, shrimp",
  ingredientsParsed: ["noodles", "shrimp"],
  dietaryFlags: { gluten_free: false },
  dietaryConfidence: 0.9,
  caloriesMin: 400,
  caloriesMax: 550,
  proteinMinG: 15,
  proteinMaxG: 22,
  carbsMinG: 50,
  carbsMaxG: 65,
  fatMinG: 12,
  fatMaxG: 18,
  macroConfidence: 0.85,
  macroSource: "ENSEMBLE",
  photoCountAnalyzed: 3,
  restaurant: {
    id: "r1", name: "Thai House", address: "123 Main St", googleRating: 4.5,
  },
  reviewSummary: {
    averageDishRating: 4.2,
    summaryText: "Great flavors",
    totalReviewsAnalyzed: 15,
    commonPraises: ["tasty", "generous portions"],
    commonComplaints: ["can be spicy"],
  },
  photos: [
    { id: "p1", sourceUrl: "http://img.com/1.jpg", sourcePlatform: "GOOGLE", macroEstimate: { calories: 480 } },
  ],
};

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/dishes/[id]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns dish detail with 200", async () => {
    (prisma.dish.findUnique as jest.Mock).mockResolvedValue(mockDish);

    const req = new Request("http://localhost/api/dishes/d1");
    const res = await getDish(req, makeParams("d1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.id).toBe("d1");
    expect(body.name).toBe("Pad Thai");
    expect(body.macros.calories).toEqual({ min: 400, max: 550 });
    expect(body.restaurant.name).toBe("Thai House");
    expect(body.review_summary.summary).toBe("Great flavors");
    expect(body.photos).toHaveLength(1);
  });

  it("returns 404 when dish not found", async () => {
    (prisma.dish.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await getDish(new Request("http://localhost"), makeParams("nope"));
    expect(res.status).toBe(404);
  });
});

describe("GET /api/dishes/[id]/similar", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns similar dishes", async () => {
    const mockSimilar = [{ id: "d2", name: "Drunken Noodles", similarity: 0.92 }];
    (findSimilarDishes as jest.Mock).mockResolvedValue(mockSimilar);

    const req = new Request("http://localhost/api/dishes/d1/similar?lat=40.7&lng=-74&limit=5");
    const res = await getSimilar(req, makeParams("d1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.dishes).toEqual(mockSimilar);
    expect(findSimilarDishes).toHaveBeenCalledWith("d1", expect.objectContaining({ limit: 5 }));
  });
});

describe("GET /api/dishes/[id]/photos", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns photos list", async () => {
    (prisma.dishPhoto.findMany as jest.Mock).mockResolvedValue([
      { id: "p1", sourceUrl: "http://img.com/1.jpg", sourcePlatform: "GOOGLE", macroEstimate: {}, analyzedAt: new Date() },
    ]);

    const req = new Request("http://localhost/api/dishes/d1/photos");
    const res = await getPhotos(req, makeParams("d1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.photos).toHaveLength(1);
    expect(body.photos[0].id).toBe("p1");
  });
});
