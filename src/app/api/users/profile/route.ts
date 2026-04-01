import { prisma } from "@/lib/db/client";
import { authenticateRequest } from "@/lib/auth/jwt";
import { checkApiRateLimit } from "@/lib/middleware/rate-limiter";

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.userProfile.findUnique({
    where: { id: auth.sub as string },
  });

  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  return Response.json({
    id: user.id,
    email: user.email,
    name: user.name,
    dietary_restrictions: user.dietaryRestrictions,
    nutritional_goals: user.nutritionalGoals,
    max_wait_minutes: user.maxWaitMinutes,
    search_radius_miles: user.searchRadiusMiles ? Number(user.searchRadiusMiles) : 2,
  });
}

export async function PATCH(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const rl = await checkApiRateLimit(ip, "write");
  if (!rl.allowed) {
    return Response.json(
      { error: "Too many requests", retryAfterSeconds: rl.retryAfterSeconds },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds ?? 60) } }
    );
  }

  const auth = await authenticateRequest(request);
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { dietary_restrictions, nutritional_goals, max_wait_minutes, search_radius_miles, preferred_cuisines } = body;

    const user = await prisma.userProfile.update({
      where: { id: auth.sub as string },
      data: {
        ...(dietary_restrictions !== undefined && { dietaryRestrictions: dietary_restrictions }),
        ...(nutritional_goals !== undefined && { nutritionalGoals: nutritional_goals }),
        ...(max_wait_minutes !== undefined && { maxWaitMinutes: max_wait_minutes }),
        ...(search_radius_miles !== undefined && { searchRadiusMiles: search_radius_miles }),
        ...(preferred_cuisines !== undefined && { preferredCuisines: preferred_cuisines }),
      },
    });

    return Response.json({
      id: user.id,
      dietary_restrictions: user.dietaryRestrictions,
      nutritional_goals: user.nutritionalGoals,
      max_wait_minutes: user.maxWaitMinutes,
      search_radius_miles: Number(user.searchRadiusMiles),
    });
  } catch {
    return Response.json({ error: "Profile update failed" }, { status: 500 });
  }
}
