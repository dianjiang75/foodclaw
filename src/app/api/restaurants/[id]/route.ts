import { prisma } from "@/lib/db/client";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      include: { deliveryOptions: true },
    });

    if (!restaurant) {
      return Response.json({ error: "Restaurant not found" }, { status: 404 });
    }

    return Response.json({
      id: restaurant.id,
      name: restaurant.name,
      address: restaurant.address,
      latitude: Number(restaurant.latitude),
      longitude: Number(restaurant.longitude),
      cuisine_type: restaurant.cuisineType,
      price_level: restaurant.priceLevel,
      google_rating: restaurant.googleRating ? Number(restaurant.googleRating) : null,
      yelp_rating: restaurant.yelpRating ? Number(restaurant.yelpRating) : null,
      phone: restaurant.phone,
      website: restaurant.websiteUrl,
      accepts_reservations: restaurant.acceptsReservations,
      delivery: restaurant.deliveryOptions.map((d) => ({
        platform: d.platform,
        available: d.isAvailable,
        fee: { min: Number(d.deliveryFeeMin), max: Number(d.deliveryFeeMax) },
        minutes: { min: d.estimatedDeliveryMinutesMin, max: d.estimatedDeliveryMinutesMax },
        url: d.platformUrl,
      })),
    });
  } catch {
    return Response.json({ error: "Failed to fetch restaurant" }, { status: 500 });
  }
}
