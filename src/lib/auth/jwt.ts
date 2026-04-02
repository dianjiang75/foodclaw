import { SignJWT, jwtVerify } from "jose";
import { redis } from "@/lib/cache/redis";

let _secret: Uint8Array | null = null;
function getSecret(): Uint8Array {
  if (!_secret) {
    const jwtSecret = process.env.JWT_SECRET;
    if (process.env.NODE_ENV === "production" && (!jwtSecret || jwtSecret.includes("change-in-production"))) {
      throw new Error("JWT_SECRET must be set to a secure value in production");
    }
    _secret = new TextEncoder().encode(jwtSecret || "foodclaw-dev-secret-change-in-production");
  }
  return _secret;
}
const ALG = "HS256";
const EXPIRY = "7d";

export interface JWTPayload {
  sub: string; // user id
  email: string;
  name: string;
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      sub: payload.sub as string,
      email: payload.email as string,
      name: payload.name as string,
    };
  } catch {
    return null;
  }
}

/** Extract token from Authorization header or cookie. */
export function extractToken(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);

  const cookie = request.headers.get("cookie");
  if (cookie) {
    const match = cookie.match(/(?:^|;\s*)token=([^;]+)/);
    if (match) return match[1];
  }

  return null;
}

/** Blacklist a token (on logout). Stored in Redis until the token's natural expiry. */
export async function revokeToken(token: string): Promise<void> {
  try {
    // Decode without verifying to get expiry, then blacklist until that time
    const payload = await verifyToken(token);
    if (!payload) return;
    // Blacklist for 7 days (max token lifetime)
    await redis.set(`bl:${token}`, "1", "EX", 7 * 24 * 60 * 60);
  } catch {
    // Token invalid — nothing to revoke
  }
}

/** Check if a token has been revoked. */
async function isRevoked(token: string): Promise<boolean> {
  try {
    const val = await redis.get(`bl:${token}`);
    return val !== null;
  } catch {
    return false; // Redis down — allow through (fail-open)
  }
}

/** Verify request and return user payload, or null. Checks blacklist. */
export async function authenticateRequest(request: Request): Promise<JWTPayload | null> {
  const token = extractToken(request);
  if (!token) return null;
  if (await isRevoked(token)) return null;
  return verifyToken(token);
}
