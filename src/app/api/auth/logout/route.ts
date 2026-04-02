import { extractToken, revokeToken } from "@/lib/auth/jwt";

export async function POST(request: Request) {
  const token = extractToken(request);
  if (token) {
    await revokeToken(token);
  }

  return new Response(null, {
    status: 204,
    headers: {
      "Set-Cookie": "token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax",
    },
  });
}
