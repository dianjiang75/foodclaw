import { prisma } from "@/lib/db/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name, dietary_restrictions, nutritional_goals } = body;

    if (!email || !name) {
      return Response.json({ error: "email and name are required" }, { status: 400 });
    }

    const user = await prisma.userProfile.create({
      data: {
        email,
        name,
        dietaryRestrictions: dietary_restrictions ?? undefined,
        nutritionalGoals: nutritional_goals ?? undefined,
      },
    });

    return Response.json({ id: user.id, email: user.email, name: user.name }, { status: 201 });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return Response.json({ error: "Email already registered" }, { status: 409 });
    }
    return Response.json({ error: "Registration failed" }, { status: 500 });
  }
}
