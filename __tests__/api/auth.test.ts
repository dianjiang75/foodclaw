import { POST as register } from "@/app/api/auth/register/route";
import { POST as login } from "@/app/api/auth/login/route";

jest.mock("@/lib/middleware/rate-limiter", () => ({
  checkApiRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 99, retryAfterSeconds: null }),
}));

jest.mock("@/lib/db/client", () => ({
  prisma: {
    userProfile: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("$2a$12$hashedpassword"),
  compare: jest.fn(),
}));

import { prisma } from "@/lib/db/client";
import { compare } from "bcryptjs";

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/register", () => {
  beforeEach(() => jest.clearAllMocks());

  it("creates a user and returns 201 with token", async () => {
    (prisma.userProfile.create as jest.Mock).mockResolvedValue({
      id: "u1", email: "a@b.com", name: "Alice",
    });

    const res = await register(jsonRequest({ email: "a@b.com", name: "Alice", password: "secret123" }));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.token).toBeDefined();
    expect(body.data.user.id).toBe("u1");
    expect(body.data.user.email).toBe("a@b.com");
  });

  it("returns 400 when email is missing", async () => {
    const res = await register(jsonRequest({ name: "Alice", password: "secret123" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when name is missing", async () => {
    const res = await register(jsonRequest({ email: "a@b.com", password: "secret123" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when password is missing", async () => {
    const res = await register(jsonRequest({ email: "a@b.com", name: "Alice" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when password is too short", async () => {
    const res = await register(jsonRequest({ email: "a@b.com", name: "Alice", password: "abc" }));
    expect(res.status).toBe(400);
  });

  it("returns 409 on duplicate email", async () => {
    (prisma.userProfile.create as jest.Mock).mockRejectedValue({ code: "P2002" });

    const res = await register(jsonRequest({ email: "a@b.com", name: "Alice", password: "secret123" }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/already registered/i);
  });
});

describe("POST /api/auth/login", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns token on valid credentials", async () => {
    (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue({
      id: "u1", email: "a@b.com", name: "Alice",
      passwordHash: "$2a$12$hashedpassword",
      dietaryRestrictions: { vegan: true },
      nutritionalGoals: { goal: "max_protein" },
    });
    (compare as jest.Mock).mockResolvedValue(true);

    const res = await login(jsonRequest({ email: "a@b.com", password: "secret123" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.token).toBeDefined();
    expect(body.data.user.id).toBe("u1");
    expect(body.data.user.dietary_restrictions).toEqual({ vegan: true });
  });

  it("returns 400 when email is missing", async () => {
    const res = await login(jsonRequest({ password: "secret123" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when password is missing", async () => {
    const res = await login(jsonRequest({ email: "a@b.com" }));
    expect(res.status).toBe(400);
  });

  it("returns 401 when user not found", async () => {
    (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await login(jsonRequest({ email: "no@one.com", password: "secret123" }));
    expect(res.status).toBe(401);
  });

  it("returns 401 on wrong password", async () => {
    (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue({
      id: "u1", email: "a@b.com", name: "Alice",
      passwordHash: "$2a$12$hashedpassword",
    });
    (compare as jest.Mock).mockResolvedValue(false);

    const res = await login(jsonRequest({ email: "a@b.com", password: "wrongpass" }));
    expect(res.status).toBe(401);
  });
});
