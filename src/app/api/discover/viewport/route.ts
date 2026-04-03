import { z } from "zod";
import { withRateLimit } from "@/lib/middleware/with-rate-limit";
import { apiSuccess, apiBadRequest } from "@/lib/utils/api-response";
import { getRestaurantsInViewport } from "@/lib/db/viewport";
import { prisma } from "@/lib/db/client";

const viewportSchema = z.object({
  neLat: z.coerce.number().min(-90).max(90),
  neLng: z.coerce.number().min(-180).max(180),
  swLat: z.coerce.number().min(-90).max(90),
  swLng: z.coerce.number().min(-180).max(180),
  cuisines: z.string().optional(),
  maxWait: z.coerce.number().int().min(1).max(120).optional(),
  userLat: z.coerce.number().min(-90).max(90).optional(),
  userLng: z.coerce.number().min(-180).max(180).optional(),
});

/**
 * GET /api/discover/viewport
 * Returns restaurants within a map viewport with top dishes and travel estimates.
 */
export const GET = withRateLimit("read", async (request) => {
  const { searchParams } = new URL(request.url);
  const parsed = viewportSchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return apiBadRequest(parsed.error.issues[0]?.message || "Invalid viewport params");
  }

  const { neLat, neLng, swLat, swLng, cuisines, maxWait, userLat, userLng } = parsed.data;

  const restaurants = await getRestaurantsInViewport(
    { neLat, neLng, swLat, swLng },
    {
      cuisines: cuisines?.split(",").filter(Boolean),
      maxWait,
    }
  );

  // Fetch top 3 dishes per restaurant
  const restaurantIds = restaurants.map((r) => r.id);
  const topDishes = restaurantIds.length > 0
    ? await prisma.dish.findMany({
        where: {
          restaurantId: { in: restaurantIds },
          isAvailable: true,
        },
        select: {
          id: true,
          name: true,
          restaurantId: true,
          caloriesMin: true,
          caloriesMax: true,
          macroConfidence: true,
        },
        orderBy: { macroConfidence: "desc" },
      })
    : [];

  // Group dishes by restaurant, take top 3
  const dishesByRestaurant = new Map<string, typeof topDishes>();
  for (const dish of topDishes) {
    const arr = dishesByRestaurant.get(dish.restaurantId) || [];
    if (arr.length < 3) arr.push(dish);
    dishesByRestaurant.set(dish.restaurantId, arr);
  }

  // Calculate distance + travel time if user location provided
  const hasUserLocation = userLat != null && userLng != null;

  return apiSuccess({
    restaurants: restaurants.map((r) => {
      let distance_miles: number | null = null;
      let walk_minutes: number | null = null;
      let drive_minutes: number | null = null;

      if (hasUserLocation) {
        // Haversine distance
        const R = 3959;
        const dLat = ((r.latitude - userLat!) * Math.PI) / 180;
        const dLng = ((r.longitude - userLng!) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos((userLat! * Math.PI) / 180) *
            Math.cos((r.latitude * Math.PI) / 180) *
            Math.sin(dLng / 2) ** 2;
        distance_miles = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
        walk_minutes = Math.round((distance_miles / 3.1) * 60);
        drive_minutes = Math.round((distance_miles / 15) * 60);
      }

      const dishes = dishesByRestaurant.get(r.id) || [];

      return {
        id: r.id,
        name: r.name,
        latitude: r.latitude,
        longitude: r.longitude,
        cuisine_type: r.cuisine_type,
        google_rating: r.google_rating,
        dish_count: r.dish_count,
        estimated_wait_minutes: r.estimated_wait_minutes,
        distance_miles,
        walk_minutes,
        drive_minutes,
        top_dishes: dishes.map((d) => ({
          id: d.id,
          name: d.name,
          calories_avg:
            d.caloriesMin && d.caloriesMax
              ? Math.round((d.caloriesMin + d.caloriesMax) / 2)
              : null,
          macro_confidence: d.macroConfidence ? Number(d.macroConfidence) : null,
        })),
      };
    }),
  });
});
