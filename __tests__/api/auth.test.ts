import { POST as register } from "@/app/api/auth/register/route";
import { POST as login } from "@/app/api/auth/login/route";

jest.mock("@/lib/db/client", () => ({
  prisma: {
    userProfile: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/db/client";

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/register", () => {
  beforeEach(() => jest.clearAllMocks());

  it("creates a user and returns 201", async () => {
    (prisma.userProfile.create as jest.Mock).mockResolvedValue({
      id: "u1", email: "a@b.com", name: "Alice",
    });

    const res = await register(jsonRequest({ email: "a@b.com", name: "Alice" }));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.id).toBe("u1");
    expect(body.email).toBe("a@b.com");
  });

  it("returns 400 when email is missing", async () => {
    const res = await register(jsonRequest({ name: "Alice" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when name is missing", async () => {
    const res = await register(jsonRequest({ email: "a@b.com" }));
    expect(res.status).toBe(400);
  });

  it("returns 409 on duplicate email", async () => {
    (prisma.userProfile.create as jest.Mock).mockRejectedValue({ code: "P2002" });

    const res = await register(jsonRequest({ email: "a@b.com", name: "Alice" }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/already registered/i);
  });
});

describe("POST /api/auth/login", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns user on valid email", async () => {
    (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue({
      id: "u1", email: "a@b.com", name: "Alice",
      dietaryRestrictions: { vegan: true },
      nutritionalGoals: { goal: "max_protein" },
    });

    const res = await login(jsonRequest({ email: "a@b.com" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.id).toBe("u1");
    expect(body.dietary_restrictions).toEqual({ vegan: true });
  });

  it("returns 400 when email is missing", async () => {
    const res = await login(jsonRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 404 when user not found", async () => {
    (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await login(jsonRequest({ email: "no@one.com" }));
    expect(res.status).toBe(404);
  });
});
