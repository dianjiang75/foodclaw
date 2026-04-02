// Mock jose for Jest (ESM-only package not compatible with CommonJS transform)
export class SignJWT {
  private payload: Record<string, unknown>;
  private header: Record<string, unknown> = {};
  private expTime = "";

  constructor(payload: Record<string, unknown>) {
    this.payload = payload;
  }

  setProtectedHeader(header: Record<string, unknown>) {
    this.header = header;
    return this;
  }

  setIssuedAt() {
    return this;
  }

  setExpirationTime(time: string) {
    this.expTime = time;
    return this;
  }

  async sign(_secret: Uint8Array): Promise<string> {
    // Return a deterministic mock JWT
    const header = Buffer.from(JSON.stringify(this.header)).toString("base64url");
    const payload = Buffer.from(
      JSON.stringify({ ...this.payload, exp: Math.floor(Date.now() / 1000) + 86400 })
    ).toString("base64url");
    const signature = Buffer.from("mock-signature").toString("base64url");
    return `${header}.${payload}.${signature}`;
  }
}

export async function jwtVerify(
  token: string,
  _secret: Uint8Array
): Promise<{ payload: Record<string, unknown> }> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid token");
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error("Token expired");
    }
    return { payload };
  } catch {
    throw new Error("Invalid token");
  }
}
