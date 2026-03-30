import { prisma } from "@/lib/db/client";

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

    return Response.json({
      photos: photos.map((p) => ({
        id: p.id,
        url: p.sourceUrl,
        source: p.sourcePlatform,
        macros: p.macroEstimate,
        analyzed_at: p.analyzedAt,
      })),
    });
  } catch {
    return Response.json({ error: "Failed to fetch photos" }, { status: 500 });
  }
}
