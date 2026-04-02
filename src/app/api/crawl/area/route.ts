import { z } from "zod";
import { withRateLimit } from "@/lib/middleware/with-rate-limit";
import { fetchWithRetry } from "@/lib/utils/fetch-retry";
import { searchNearby } from "@/lib/google-places/client";

const crawlAreaSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radius_miles: z.number().min(0.1).max(25).optional(),
});

export const POST = withRateLimit("crawl", async (request) => {
  try {
    const body = await request.json().catch(() => null);
    const parsed = crawlAreaSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0]?.message || "latitude and longitude are required" }, { status: 400 });
    }
    const { latitude, longitude, radius_miles } = parsed.data;

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey || apiKey === "placeholder") {
      return Response.json({ error: "Google Places API not configured" }, { status: 503 });
    }

    const radiusMeters = Math.round((radius_miles || 0.5) * 1609.34);

    // Google Places API v2 (New) — POST-based nearby search
    const places = await searchNearby(latitude, longitude, radiusMeters, {
      type: "restaurant",
    });

    const { flowProducer } = await import("@/../workers/queues");

    // Also lookup Yelp business IDs for each restaurant
    const yelpKey = process.env.YELP_API_KEY;

    // Build FlowProducer children — one crawl job per restaurant
    const children = [];
    for (const place of places) {
      let yelpBusinessId: string | null = null;

      if (yelpKey && yelpKey !== "placeholder") {
        try {
          const yelpRes = await fetchWithRetry(
            `https://api.yelp.com/v3/businesses/matches?name=${encodeURIComponent(place.displayName?.text || "")}&address1=${encodeURIComponent(place.formattedAddress || "")}&city=New York&state=NY&country=US&limit=1`,
            { headers: { Authorization: `Bearer ${yelpKey}` } },
            { maxRetries: 2 }
          );
          if (yelpRes.ok) {
            const yelpData = await yelpRes.json();
            yelpBusinessId = yelpData.businesses?.[0]?.id || null;
          }
        } catch {
          // Yelp lookup failed — continue without it
        }
      }

      children.push({
        name: "area-crawl",
        queueName: "menu-crawl",
        data: { googlePlaceId: place.id, yelpBusinessId },
        opts: {
          jobId: `crawl-${place.id}`,
          attempts: 3,
          backoff: { type: "exponential" as const, delay: 5000 },
        },
      });
    }

    // Atomic add: either all jobs are enqueued or none
    if (children.length > 0) {
      await flowProducer.add({
        name: "area-crawl-complete",
        queueName: "menu-crawl",
        data: { latitude, longitude, restaurantCount: children.length },
        children,
      });
    }

    return Response.json({
      restaurants_found: places.length,
      jobs_queued: children.length,
    }, { status: 202 });
  } catch {
    return Response.json({ error: "Failed to trigger area crawl" }, { status: 500 });
  }
});
