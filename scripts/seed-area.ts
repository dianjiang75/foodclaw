/**
 * Seed script: discovers restaurants in an area and queues crawl jobs.
 * Usage: npx tsx -r tsconfig-paths/register scripts/seed-area.ts <lat> <lng> <radius_miles>
 * Example: npx tsx -r tsconfig-paths/register scripts/seed-area.ts 40.735 -73.991 0.5
 */
import "dotenv/config";

async function main() {
  const [latStr, lngStr, radiusStr] = process.argv.slice(2);

  if (!latStr || !lngStr) {
    console.error("Usage: npx tsx -r tsconfig-paths/register scripts/seed-area.ts <lat> <lng> [radius_miles]");
    process.exit(1);
  }

  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);
  const radiusMiles = parseFloat(radiusStr || "0.5");
  const radiusMeters = Math.round(radiusMiles * 1609.34);

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey || apiKey === "placeholder") {
    console.error("Error: GOOGLE_PLACES_API_KEY is not configured");
    process.exit(1);
  }

  console.log(`\nDiscovering restaurants within ${radiusMiles} miles of (${lat}, ${lng})\n`);

  // Use Google Places Nearby Search
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radiusMeters}&type=restaurant&key=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) {
    console.error(`Google Places API failed: ${res.status}`);
    process.exit(1);
  }

  const data = await res.json();
  const places = data.results || [];

  console.log(`Found ${places.length} restaurants`);

  // Queue crawl jobs
  const { menuCrawlQueue } = await import("../workers/queues");

  let queued = 0;
  for (const place of places) {
    await menuCrawlQueue.add(
      "crawl",
      { googlePlaceId: place.place_id },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      }
    );
    console.log(`  Queued: ${place.name} (${place.place_id})`);
    queued++;
  }

  console.log(`\n${queued} crawl jobs queued. Start the crawl worker to process them.`);

  await menuCrawlQueue.close();
  process.exit(0);
}

main();
