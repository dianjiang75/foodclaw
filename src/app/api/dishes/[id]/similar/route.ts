import { findSimilarDishes } from "@/lib/similarity";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    const lat = parseFloat(searchParams.get("lat") || "0");
    const lng = parseFloat(searchParams.get("lng") || "0");
    const radius = parseFloat(searchParams.get("radius") || "2");
    const limit = parseInt(searchParams.get("limit") || "5");

    const similar = await findSimilarDishes(id, {
      latitude: lat,
      longitude: lng,
      radius_miles: radius,
      limit,
    });

    return Response.json({ dishes: similar });
  } catch (error) {
    return Response.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
