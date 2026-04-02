import { prisma } from "@/lib/db/client";
import { compare } from "bcryptjs";
import { signToken } from "@/lib/auth/jwt";
import { checkApiRateLimit } from "@/lib/middleware/rate-limiter";
import { apiBadRequest, apiError, apiRateLimited } from "@/lib/utils/api-response";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
    const rl = await checkApiRateLimit(ip, "auth");
    if (!rl.allowed) {
      return apiRateLimited(rl.retryAfterSeconds);
    }

    const { email, password } = await request.json();
    if (!email || !password) {
      return apiBadRequest("email and password are required");
    }

    const user = await prisma.userProfile.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      return apiError("Invalid credentials", 401);
    }

    const valid = await compare(password, user.passwordHash);
    if (!valid) {
      return apiError("Invalid credentials", 401);
    }

    const token = await signToken({ sub: user.id, email: user.email, name: user.name });

    return Response.json(
      {
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            dietary_restrictions: user.dietaryRestrictions,
            nutritional_goals: user.nutritionalGoals,
          },
        },
      },
      {
        headers: { "Set-Cookie": `token=${token}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${7 * 24 * 60 * 60}` },
      }
    );
  } catch {
    return apiError("Login failed");
  }
}
