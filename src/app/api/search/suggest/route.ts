import { prisma } from "@/lib/db/client";
import { withRateLimit } from "@/lib/middleware/with-rate-limit";
import { apiSuccess } from "@/lib/utils/api-response";

export const dynamic = "force-dynamic";

/**
 * Search autocomplete suggestions.
 * Returns top 5 dish names matching the query using a 3-tier strategy:
 *   1. ILIKE prefix match (fastest, most relevant)
 *   2. ILIKE contains match (mid-word searches)
 *   3. pg_trgm fuzzy match (typo tolerance — "chiken" → "Chicken Tikka")
 */
export const GET = withRateLimit("read", async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();

    if (!q || q.length < 2) {
      return apiSuccess({ suggestions: [] });
    }

    // Tier 1: prefix match (fastest, most relevant)
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

    // Tier 2: contains match if prefix returned < 3
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
      const seen = new Set(dishes.map((d) => d.name.toLowerCase()));
      for (const d of containsDishes) {
        if (!seen.has(d.name.toLowerCase())) {
          dishes.push(d);
          seen.add(d.name.toLowerCase());
        }
        if (dishes.length >= 5) break;
      }
    }

    // Tier 3: pg_trgm fuzzy match if still < 3 results (typo tolerance)
    if (dishes.length < 3) {
      try {
        const fuzzyResults = await prisma.$queryRaw<
          { name: string; category: string; restaurant_name: string; sim: number }[]
        >`
          SELECT DISTINCT ON (d.name) d.name, d.category, r.name AS restaurant_name,
            similarity(d.name, ${q}) AS sim
          FROM dishes d
          JOIN restaurants r ON d.restaurant_id = r.id
          WHERE d.is_available = true
            AND similarity(d.name, ${q}) > 0.2
          ORDER BY d.name, sim DESC
          LIMIT 5
        `;

        const seen = new Set(dishes.map((d) => d.name.toLowerCase()));
        for (const r of fuzzyResults) {
          if (!seen.has(r.name.toLowerCase())) {
            dishes.push({
              name: r.name,
              category: r.category,
              restaurant: { name: r.restaurant_name },
            });
            seen.add(r.name.toLowerCase());
          }
          if (dishes.length >= 5) break;
        }
      } catch {
        // pg_trgm extension not available — skip fuzzy tier
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
