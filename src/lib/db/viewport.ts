/**
 * Viewport-based restaurant queries for the map discovery feature.
 * Uses simple lat/lng BETWEEN for rectangular map viewports
 * (faster than earth_box for non-circular bounds).
 */
import { prisma } from "./client";

export interface ViewportBounds {
  neLat: number;
  neLng: number;
  swLat: number;
  swLng: number;
}

export interface ViewportFilters {
  cuisines?: string[];
  diets?: string[];
  maxWait?: number;
}

export interface ViewportRestaurant {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  cuisine_type: string[];
  google_rating: number | null;
  dish_count: number;
  estimated_wait_minutes: number | null;
}

/**
 * Get restaurants within a map viewport with dish counts.
 * Caps at 100 results — at low zoom levels, returns closest to viewport center.
 */
export async function getRestaurantsInViewport(
  bounds: ViewportBounds,
  filters?: ViewportFilters
): Promise<ViewportRestaurant[]> {
  // Build dynamic WHERE clauses
  const cuisineFilter = filters?.cuisines?.length
    ? `AND r.cuisine_type && ARRAY[${filters.cuisines.map((c) => `'${c.replace(/'/g, "''")}'`).join(",")}]::text[]`
    : "";

  const waitFilter = filters?.maxWait
    ? `AND (rl.estimated_wait_minutes IS NULL OR rl.estimated_wait_minutes <= ${Number(filters.maxWait)})`
    : "";

  const now = new Date();
  const dayOfWeek = now.getDay();
  const hour = now.getHours();

  const rows = await prisma.$queryRaw<ViewportRestaurant[]>`
    SELECT
      r.id,
      r.name,
      r.latitude::float AS latitude,
      r.longitude::float AS longitude,
      r.cuisine_type,
      r.google_rating::float AS google_rating,
      COUNT(d.id)::int AS dish_count,
      rl.estimated_wait_minutes::int AS estimated_wait_minutes
    FROM restaurants r
    LEFT JOIN dishes d ON d.restaurant_id = r.id AND d.is_available = true
    LEFT JOIN restaurant_logistics rl ON rl.restaurant_id = r.id
      AND rl.day_of_week = ${dayOfWeek}
      AND rl.hour = ${hour}
    WHERE r.is_active = true
      AND r.latitude::float BETWEEN ${bounds.swLat} AND ${bounds.neLat}
      AND r.longitude::float BETWEEN ${bounds.swLng} AND ${bounds.neLng}
    GROUP BY r.id, r.name, r.latitude, r.longitude, r.cuisine_type, r.google_rating,
             rl.estimated_wait_minutes
    HAVING COUNT(d.id) > 0
    ORDER BY r.google_rating DESC NULLS LAST
    LIMIT 100
  `;

  return rows;
}
