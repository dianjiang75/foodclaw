import { prisma } from "@/lib/db/client";
import { withRateLimit } from "@/lib/middleware/with-rate-limit";
import { apiSuccess } from "@/lib/utils/api-response";

export const dynamic = "force-dynamic";

/**
 * Search autocomplete suggestions.
 * Returns top 5 dish names matching the query using ILIKE prefix match
 * with fallback to contains match for mid-word searches.
 *
 * Future: upgrade to pg_trgm for fuzzy/typo-tolerant matching.
 */
export const GET = withRateLimit("read", async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();

    if (!q || q.length < 2) {
      return apiSuccess({ suggestions: [] });
    }

    // Try prefix match first (faster, more relevant)
    const dishes = await prisma.dish.findMany({
      where: {
        isAvailable: true,
        name: { startsWith: q, mode: "insensitive" },
      },
      select: { name: true, category: true, restaurant: { select: { name: true } } },
      distinct: ["name"],
      take: 5,
      orderBy: { name: "asc" },
    });

    // Fallback to contains if prefix returns < 3
    if (dishes.length < 3) {
      const containsDishes = await prisma.dish.findMany({
        where: {
          isAvailable: true,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { name: true, category: true, restaurant: { select: { name: true } } },
        distinct: ["name"],
        take: 5,
        orderBy: { name: "asc" },
      });
      // Merge, dedup by name
      const seen = new Set(dishes.map((d) => d.name.toLowerCase()));
      for (const d of containsDishes) {
        if (!seen.has(d.name.toLowerCase())) {
          dishes.push(d);
          seen.add(d.name.toLowerCase());
        }
        if (dishes.length >= 5) break;
      }
    }

    return apiSuccess({
      suggestions: dishes.map((d) => ({
        name: d.name,
        category: d.category,
        restaurant: d.restaurant.name,
      })),
    });
  } catch {
    return apiSuccess({ suggestions: [] });
  }
});
