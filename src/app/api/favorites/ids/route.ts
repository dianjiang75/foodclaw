import { prisma } from "@/lib/db/client";
import { authenticateRequest } from "@/lib/auth/jwt";

/** Returns just the dish IDs the user has favorited — lightweight for card rendering. */
export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return Response.json({ ids: [] });
  }

  const favorites = await prisma.userFavorite.findMany({
    where: { userId: auth.sub as string },
    select: { dishId: true },
  });

  return Response.json({ ids: favorites.map((f) => f.dishId) });
}
