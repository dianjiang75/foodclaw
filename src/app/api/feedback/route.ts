import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { withRateLimit } from "@/lib/middleware/with-rate-limit";
import { apiSuccess, apiBadRequest, apiError } from "@/lib/utils/api-response";

const feedbackSchema = z.object({
  dish_id: z.string().uuid("Invalid dish_id"),
  user_id: z.string().uuid("Invalid user_id"),
  feedback_type: z.enum([
    "portion_bigger", "portion_smaller", "portion_accurate",
    "ingredient_correction", "dish_unavailable", "photo_submission",
  ]),
  details: z.any().optional(),
  photo_url: z.string().url("Invalid photo URL").max(2048).nullable().optional(),
});

export const POST = withRateLimit("write", async (request) => {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return apiBadRequest("Invalid JSON body");
    }

    const parsed = feedbackSchema.safeParse(body);
    if (!parsed.success) {
      return apiBadRequest("Validation failed", parsed.error.flatten().fieldErrors as Record<string, unknown>);
    }

    const { dish_id, user_id, feedback_type, details, photo_url } = parsed.data;

    const feedback = await prisma.communityFeedback.create({
      data: {
        dishId: dish_id,
        userId: user_id,
        feedbackType: feedback_type,
        details: details ?? undefined,
        photoUrl: photo_url ?? null,
      },
    });

    return apiSuccess({ id: feedback.id }, 201);
  } catch {
    return apiError("Failed to submit feedback");
  }
});
