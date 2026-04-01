import { SignJWT, jwtVerify } from "jose";

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

/** Verify request and return user payload, or null. */
export async function authenticateRequest(request: Request): Promise<JWTPayload | null> {
  const token = extractToken(request);
  if (!token) return null;
  return verifyToken(token);
}
