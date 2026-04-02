import { PATCH, GET } from "@/app/api/users/profile/route";
import { signToken } from "@/lib/auth/jwt";

jest.mock("@/lib/middleware/rate-limiter", () => ({
  checkApiRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 99, retryAfterSeconds: null }),
}));

jest.mock("@/lib/db/client", () => ({
  prisma: {
    userProfile: {
      update: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/db/client";

async function authedRequest(method: string, body?: unknown): Promise<Request> {
  const token = await signToken({ sub: "u1", email: "a@b.com", name: "Alice" });
  return new Request("http://localhost/api/users/profile", {
    method,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

describe("PATCH /api/users/profile", () => {
  beforeEach(() => jest.clearAllMocks());

  it("updates user preferences and returns 200", async () => {
    (prisma.userProfile.update as jest.Mock).mockResolvedValue({
      id: "u1",
      dietaryRestrictions: { vegan: true },
      nutritionalGoals: { goal: "max_protein" },
      maxWaitMinutes: 20,
      searchRadiusMiles: 3,
    });

    const req = await authedRequest("PATCH", {
      dietary_restrictions: { vegan: true },
      max_wait_minutes: 20,
    });
    const res = await PATCH(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.id).toBe("u1");
    expect(body.data.max_wait_minutes).toBe(20);
    expect(body.data.search_radius_miles).toBe(3);
  });

  it("returns 401 without auth token", async () => {
    const req = new Request("http://localhost/api/users/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dietary_restrictions: { vegan: true } }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(401);
  });

  it("returns 500 on database error", async () => {
    (prisma.userProfile.update as jest.Mock).mockRejectedValue(new Error("DB error"));

    const req = await authedRequest("PATCH", { dietary_restrictions: { vegan: true } });
    const res = await PATCH(req);
    expect(res.status).toBe(500);
  });
});

describe("GET /api/users/profile", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns user profile when authenticated", async () => {
    (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue({
      id: "u1",
      email: "a@b.com",
      name: "Alice",
      dietaryRestrictions: { vegan: true },
      nutritionalGoals: { goal: "max_protein" },
      maxWaitMinutes: 15,
      searchRadiusMiles: 2,
    });

    const req = await authedRequest("GET");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.id).toBe("u1");
    expect(body.data.dietary_restrictions).toEqual({ vegan: true });
  });

  it("returns 401 without auth token", async () => {
    const req = new Request("http://localhost/api/users/profile", { method: "GET" });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});
