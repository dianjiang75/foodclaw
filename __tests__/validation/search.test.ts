import { validateSearchParams } from "@/lib/validation/search";

describe("validateSearchParams", () => {
  function makeParams(obj: Record<string, string>) {
    return new URLSearchParams(obj);
  }

  it("validates valid params", () => {
    const result = validateSearchParams(makeParams({ lat: "40.7", lng: "-73.9" }));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.lat).toBeCloseTo(40.7);
      expect(result.data.lng).toBeCloseTo(-73.9);
      expect(result.data.radius).toBe(2); // default
      expect(result.data.limit).toBe(20); // default
    }
  });

  it("rejects missing lat/lng", () => {
    const result = validateSearchParams(makeParams({}));
    expect(result.success).toBe(false);
  });

  it("rejects out-of-range latitude", () => {
    const result = validateSearchParams(makeParams({ lat: "100", lng: "0" }));
    expect(result.success).toBe(false);
  });

  it("rejects out-of-range longitude", () => {
    const result = validateSearchParams(makeParams({ lat: "40", lng: "200" }));
    expect(result.success).toBe(false);
  });

  it("accepts valid optional params", () => {
    const result = validateSearchParams(makeParams({
      lat: "40.7", lng: "-73.9",
      radius: "5", limit: "50", offset: "10",
      q: "chicken", sort: "rating", goal: "max_protein",
      calorie_limit: "500", protein_min: "30",
    }));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.radius).toBe(5);
      expect(result.data.limit).toBe(50);
      expect(result.data.q).toBe("chicken");
      expect(result.data.sort).toBe("rating");
      expect(result.data.calorie_limit).toBe(500);
    }
  });

  it("rejects invalid sort option", () => {
    const result = validateSearchParams(makeParams({ lat: "40", lng: "-73", sort: "invalid" }));
    expect(result.success).toBe(false);
  });

  it("clamps limit to max 100", () => {
    const result = validateSearchParams(makeParams({ lat: "40", lng: "-73", limit: "999" }));
    expect(result.success).toBe(false);
  });

  it("rejects negative radius", () => {
    const result = validateSearchParams(makeParams({ lat: "40", lng: "-73", radius: "-1" }));
    expect(result.success).toBe(false);
  });
});
