jest.mock("@/lib/orchestrator", () => ({
  search: jest.fn(),
}));

import { GET } from "@/app/api/search/route";
import { search } from "@/lib/orchestrator";

describe("GET /api/search", () => {
  beforeEach(() => jest.clearAllMocks());

  it("calls orchestrator with parsed params and returns results", async () => {
    const mockResults = { dishes: [], total: 0, cached: false };
    (search as jest.Mock).mockResolvedValue(mockResults);

    const url = "http://localhost/api/search?lat=40.7&lng=-74.0&diet=vegan,gluten_free&goal=max_protein&limit=10";
    const req = new Request(url);
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        latitude: 40.7,
        longitude: -74.0,
        limit: 10,
        nutritional_goal: "max_protein",
      })
    );
    expect(body.data).toEqual(mockResults);
  });

  it("returns 400 when lat/lng missing", async () => {
    const res = await GET(new Request("http://localhost/api/search"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when lat is not a number", async () => {
    const res = await GET(new Request("http://localhost/api/search?lat=abc&lng=-74"));
    expect(res.status).toBe(400);
  });

  it("returns 500 on orchestrator error", async () => {
    (search as jest.Mock).mockRejectedValue(new Error("fail"));
    const res = await GET(new Request("http://localhost/api/search?lat=40.7&lng=-74"));
    expect(res.status).toBe(500);
  });
});
