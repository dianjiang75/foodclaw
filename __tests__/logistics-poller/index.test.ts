jest.mock("@/lib/cache/redis", () => ({
  redis: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue("OK"),
  },
}));

jest.mock("@/lib/db/client", () => ({
  prisma: {
    restaurantLogistics: { upsert: jest.fn().mockResolvedValue({}) },
    restaurant: { update: jest.fn().mockResolvedValue({}) },
  },
}));

import {
  estimateWaitMinutes,
  checkDeliveryAvailability,
} from "@/lib/agents/logistics-poller";

describe("Logistics Poller", () => {
  describe("estimateWaitMinutes", () => {
    it("returns 0 for 0% busyness", () => {
      expect(estimateWaitMinutes(0)).toBe(0);
    });

    it("returns ~5 min for 30% busyness", () => {
      expect(estimateWaitMinutes(30)).toBe(5);
    });

    it("returns ~15 min for 50% busyness", () => {
      expect(estimateWaitMinutes(50)).toBe(15);
    });

    it("returns ~25 min for 70% busyness", () => {
      expect(estimateWaitMinutes(70)).toBe(25);
    });

    it("returns ~40 min for 85% busyness", () => {
      expect(estimateWaitMinutes(85)).toBe(40);
    });

    it("returns ~60 min for 100% busyness", () => {
      expect(estimateWaitMinutes(100)).toBe(60);
    });

    it("scales linearly within ranges", () => {
      // Mid-range for 30-50% band (40% → should be ~10 min)
      const mid = estimateWaitMinutes(40);
      expect(mid).toBeGreaterThanOrEqual(8);
      expect(mid).toBeLessThanOrEqual(12);
    });
  });

  describe("checkDeliveryAvailability", () => {
    it("returns mock delivery data with UberEats and DoorDash", async () => {
      const result = await checkDeliveryAvailability(
        "Test Restaurant",
        "123 Main St"
      );

      expect(result).toHaveLength(2);
      expect(result[0].platform).toBe("ubereats");
      expect(result[0].is_available).toBe(true);
      expect(result[1].platform).toBe("doordash");
      expect(result[1].delivery_fee_min).toBeGreaterThan(0);
      expect(result[1].estimated_minutes_min).toBeGreaterThan(0);
    });
  });
});
