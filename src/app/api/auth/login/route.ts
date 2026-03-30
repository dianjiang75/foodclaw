import { prisma } from "@/lib/db/client";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email) {
      return Response.json({ error: "email is required" }, { status: 400 });
    }

    const user = await prisma.userProfile.findUnique({ where: { email } });
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // Simplified auth — in production, use JWT or session tokens
    return Response.json({
      id: user.id,
      email: user.email,
      name: user.name,
      dietary_restrictions: user.dietaryRestrictions,
      nutritional_goals: user.nutritionalGoals,
    });
  } catch {
    return Response.json({ error: "Login failed" }, { status: 500 });
  }
}
