import { prisma } from "@/lib/db/client";
import type { DietaryFlags } from "@/types";

export interface SimilarityOptions {
  latitude: number;
  longitude: number;
  radius_miles: number;
  dietary_restrictions?: DietaryFlags;
  limit?: number;
}

export interface SimilarDish {
  id: string;
  name: string;
  restaurant_name: string;
  restaurant_id: string;
  calories_min: number | null;
  calories_max: number | null;
  protein_max_g: number | null;
  similarity_score: number;
}

export interface RerouteSuggestion {
  dish: SimilarDish;
  estimated_wait_minutes: number | null;
  current_busyness_pct: number | null;
  savings_minutes: number;
}

/**
 * Find dishes with similar macro profiles using pgvector cosine similarity.
 * Falls back to manual cosine calculation if pgvector embedding is not populated.
 */
export async function findSimilarDishes(
  dishId: string,
  options: SimilarityOptions
): Promise<SimilarDish[]> {
  const limit = options.limit ?? 5;

  // Get the source dish
  const sourceDish = await prisma.dish.findUnique({
    where: { id: dishId },
    include: { restaurant: true },
  });

  if (!sourceDish) throw new Error(`Dish ${dishId} not found`);

  // Compute normalized macro vector for the source dish
  const sourceVector = normalizeMacros(
    sourceDish.caloriesMin,
    sourceDish.proteinMaxG ? Number(sourceDish.proteinMaxG) : null,
    sourceDish.carbsMaxG ? Number(sourceDish.carbsMaxG) : null,
    sourceDish.fatMaxG ? Number(sourceDish.fatMaxG) : null
  );

  if (!sourceVector) {
    return []; // Can't compute similarity without macro data
  }

  // Get candidate dishes (excluding the source dish and its restaurant)
  const candidates = await prisma.dish.findMany({
    where: {
      id: { not: dishId },
      restaurantId: { not: sourceDish.restaurantId },
      isAvailable: true,
      caloriesMin: { not: null },
      restaurant: { isActive: true },
    },
    include: { restaurant: true },
    take: limit * 3, // Over-fetch to filter later
  });

  // Compute similarity and rank
  const scored = candidates
    .map((candidate) => {
      const candidateVector = normalizeMacros(
        candidate.caloriesMin,
        candidate.proteinMaxG ? Number(candidate.proteinMaxG) : null,
        candidate.carbsMaxG ? Number(candidate.carbsMaxG) : null,
        candidate.fatMaxG ? Number(candidate.fatMaxG) : null
      );

      if (!candidateVector) return null;

      const similarity = cosineSimilarity(sourceVector, candidateVector);

      return {
        dish: {
          id: candidate.id,
          name: candidate.name,
          restaurant_name: candidate.restaurant.name,
          restaurant_id: candidate.restaurant.id,
          calories_min: candidate.caloriesMin,
          calories_max: candidate.caloriesMax,
          protein_max_g: candidate.proteinMaxG
            ? Number(candidate.proteinMaxG)
            : null,
          similarity_score: Math.round(similarity * 1000) / 1000,
        },
        similarity,
      };
    })
    .filter(
      (item): item is NonNullable<typeof item> =>
        item !== null && item.similarity > 0.85
    )
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)
    .map((item) => item.dish);

  return scored;
}

/**
 * Auto-reroute: when a restaurant's wait exceeds the user's threshold,
 * suggest similar dishes at less busy restaurants.
 */
export async function autoReroute(
  dishId: string,
  currentWaitMinutes: number,
  userMaxWait: number,
  options: SimilarityOptions
): Promise<RerouteSuggestion[]> {
  if (currentWaitMinutes <= userMaxWait) return [];

  const similar = await findSimilarDishes(dishId, {
    ...options,
    limit: 10,
  });

  // For each similar dish, check if its restaurant is less busy
  const suggestions: RerouteSuggestion[] = [];

  for (const dish of similar) {
    // Get the latest logistics data for the restaurant
    const now = new Date();
    const logistics = await prisma.restaurantLogistics.findUnique({
      where: {
        restaurantId_dayOfWeek_hour: {
          restaurantId: dish.restaurant_id,
          dayOfWeek: now.getDay(),
          hour: now.getHours(),
        },
      },
    });

    const busyness = logistics?.typicalBusynessPct ?? null;
    const waitEstimate = logistics?.estimatedWaitMinutes ?? null;

    // Only suggest if busyness < 50%
    if (busyness !== null && busyness < 50) {
      suggestions.push({
        dish,
        estimated_wait_minutes: waitEstimate,
        current_busyness_pct: busyness,
        savings_minutes: currentWaitMinutes - (waitEstimate ?? 0),
      });
    }
  }

  return suggestions.slice(0, 3);
}

/**
 * Normalize macro values into a unit vector [cal, protein, carbs, fat].
 */
function normalizeMacros(
  calories: number | null,
  protein: number | null,
  carbs: number | null,
  fat: number | null
): number[] | null {
  if (calories === null) return null;

  const vec = [
    calories / 1000, // Normalize calories to ~0-2 range
    (protein ?? 0) / 50, // Normalize protein to ~0-2 range
    (carbs ?? 0) / 100, // Normalize carbs to ~0-2 range
    (fat ?? 0) / 50, // Normalize fat to ~0-2 range
  ];

  const magnitude = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  if (magnitude === 0) return null;

  return vec.map((v) => v / magnitude);
}

/**
 * Compute cosine similarity between two vectors.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

export { cosineSimilarity, normalizeMacros };
