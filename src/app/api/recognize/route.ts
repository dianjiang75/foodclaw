import { z } from "zod";
import { withRateLimit } from "@/lib/middleware/with-rate-limit";
import { apiSuccess, apiBadRequest, apiError } from "@/lib/utils/api-response";
import { findDishesByNameSimilarity } from "@/lib/db/geo";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const paramsSchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radius: z.coerce.number().min(0.1).max(25).default(2),
});

/**
 * POST /api/recognize
 * Accept a food photo, identify the dish via Gemini, and match to nearby DB dishes.
 * Request: multipart/form-data with `photo` file + optional `lat`, `lng`, `radius` fields.
 * Response: { recognition: VisionAnalysis, db_matches: [...] }
 */
export const POST = withRateLimit("write", async (request) => {
  try {
    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return apiBadRequest("Expected multipart/form-data with a 'photo' field");
    }

    const file = formData.get("photo");
    if (!file || !(file instanceof File)) {
      return apiBadRequest("Missing 'photo' file field");
    }

    // Validate file type and size
    if (!ALLOWED_TYPES.has(file.type)) {
      return apiBadRequest(`Unsupported image type: ${file.type}. Use JPEG, PNG, or WebP.`);
    }
    if (file.size > MAX_FILE_SIZE) {
      return apiBadRequest(`File too large (${Math.round(file.size / 1024 / 1024)}MB). Max 10MB.`);
    }

    // Parse optional geo params
    const params = paramsSchema.safeParse({
      lat: formData.get("lat") ?? undefined,
      lng: formData.get("lng") ?? undefined,
      radius: formData.get("radius") ?? undefined,
    });
    const { lat, lng, radius } = params.success ? params.data : { lat: undefined, lng: undefined, radius: 2 };

    // Convert file to buffer and analyze
    const buffer = Buffer.from(await file.arrayBuffer());
    const { analyzeFoodPhotoFromBuffer } = await import("@/lib/agents/vision-analyzer");
    const recognition = await analyzeFoodPhotoFromBuffer(buffer);

    // Find matching dishes in DB using pg_trgm similarity
    let dbMatches: Awaited<ReturnType<typeof findDishesByNameSimilarity>> = [];
    try {
      dbMatches = await findDishesByNameSimilarity(
        recognition.dish_name,
        lat,
        lng,
        radius,
        10
      );
    } catch {
      // pg_trgm not available or query failed — return recognition without matches
    }

    return apiSuccess({
      recognition: {
        dish_name: recognition.dish_name,
        cuisine_type: recognition.cuisine_type,
        confidence: recognition.confidence,
        preparation_method: recognition.preparation_method,
        macros: recognition.macros,
        ingredients: recognition.ingredients.map((i) => ({
          name: i.name,
          estimated_grams: i.estimated_grams,
          is_primary: i.is_primary,
        })),
      },
      db_matches: dbMatches.map((m) => ({
        id: m.id,
        name: m.name,
        similarity_score: Math.round(Number(m.similarity_score) * 100) / 100,
        restaurant_name: m.restaurant_name,
        restaurant_id: m.restaurant_id,
        distance_miles: m.distance_miles ? Math.round(Number(m.distance_miles) * 10) / 10 : null,
        calories_min: m.calories_min,
        calories_max: m.calories_max,
        macro_confidence: m.macro_confidence,
        photo_url: m.photo_url,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Recognition failed";
    if (message.includes("too dark") || message.includes("too bright")) {
      return apiError(message, 422);
    }
    return apiError(message);
  }
});
