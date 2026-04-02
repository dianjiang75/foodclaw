import { prisma } from "@/lib/db/client";
import { apiSuccess, apiError } from "@/lib/utils/api-response";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const photos = await prisma.dishPhoto.findMany({
      where: { dishId: id },
      orderBy: { createdAt: "desc" },
    });

    return apiSuccess({
      photos: photos.map((p) => ({
        id: p.id,
        url: p.sourceUrl,
        source: p.sourcePlatform,
        macros: p.macroEstimate,
        analyzed_at: p.analyzedAt,
      })),
    });
  } catch {
    return apiError("Failed to fetch photos");
  }
}
