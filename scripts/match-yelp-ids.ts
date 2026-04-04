/**
 * Match all restaurants to Yelp Business IDs using Yelp Business Match API.
 *
 * Uses restaurant name + address from our DB to find the matching Yelp business.
 * Falls back to Business Search if Match returns nothing.
 *
 * Usage: npx tsx scripts/match-yelp-ids.ts [--dry-run]
 */
import "dotenv/config";

const YELP_API_BASE = "https://api.yelp.com/v3";

interface YelpBusiness {
  id: string;
  name: string;
  location?: { address1?: string; city?: string; state?: string; zip_code?: string };
}

async function yelpBusinessMatch(
  name: string,
  address: string,
  city: string,
  state: string,
  apiKey: string
): Promise<string | null> {
  // Try Yelp Business Match endpoint first (exact match)
  try {
    const params = new URLSearchParams({
      name,
      address1: address,
      city,
      state,
      country: "US",
    });
    const res = await fetch(`${YELP_API_BASE}/businesses/matches?${params}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.businesses?.length > 0) {
        return data.businesses[0].id;
      }
    }
  } catch {
    // Fall through to search
  }

  // Fallback: Yelp Business Search (fuzzy match by name + location)
  try {
    const params = new URLSearchParams({
      term: name,
      location: `${address}, ${city}, ${state}`,
      limit: "3",
      categories: "restaurants,food",
    });
    const res = await fetch(`${YELP_API_BASE}/businesses/search?${params}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (res.ok) {
      const data = await res.json();
      const businesses: YelpBusiness[] = data.businesses || [];

      // Find best match by name similarity
      const nameLower = name.toLowerCase();
      const match = businesses.find(
        (b) =>
          b.name.toLowerCase() === nameLower ||
          b.name.toLowerCase().includes(nameLower) ||
          nameLower.includes(b.name.toLowerCase())
      );
      return match?.id || businesses[0]?.id || null;
    }
  } catch {
    // Give up
  }

  return null;
}

/**
 * Parse Google's formattedAddress into components.
 * Format: "123 Main St, New York, NY 10001, USA"
 */
function parseAddress(formattedAddress: string): {
  street: string;
  city: string;
  state: string;
} {
  const parts = formattedAddress.split(",").map((s) => s.trim());
  // Typical: [street, city, "stateZip", country]
  const street = parts[0] || "";
  const city = parts[1] || "";
  const stateZip = parts[2] || "";
  const state = stateZip.split(/\s+/)[0] || "";
  return { street, city, state };
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const apiKey = process.env.YELP_API_KEY;
  if (!apiKey || apiKey === "placeholder") {
    console.error("YELP_API_KEY not configured");
    process.exit(1);
  }

  const { PrismaClient } = await import("../src/generated/prisma/client");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  console.log(`\nYelp Business ID Matching`);
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}\n`);

  const restaurants = await prisma.restaurant.findMany({
    where: { isActive: true, yelpBusinessId: null },
    select: { id: true, name: true, address: true },
    orderBy: { name: "asc" },
  });

  console.log(`${restaurants.length} restaurants missing Yelp IDs\n`);

  let matched = 0;
  let failed = 0;
  let errors = 0;

  for (let i = 0; i < restaurants.length; i++) {
    const r = restaurants[i];
    const prefix = `[${i + 1}/${restaurants.length}]`;
    const { street, city, state } = parseAddress(r.address);

    try {
      // Rate limit: ~5 req/sec to stay under Yelp's 500/day on free tier
      if (i > 0) await new Promise((resolve) => setTimeout(resolve, 300));

      const yelpId = await yelpBusinessMatch(r.name, street, city, state, apiKey);

      if (yelpId) {
        console.log(`${prefix} ${r.name} → ${yelpId}`);
        if (!dryRun) {
          await prisma.restaurant.update({
            where: { id: r.id },
            data: { yelpBusinessId: yelpId },
          });
        }
        matched++;
      } else {
        console.log(`${prefix} ${r.name} → NO MATCH`);
        failed++;
      }
    } catch (err) {
      console.error(`${prefix} ${r.name} → ERROR: ${(err as Error).message}`);
      errors++;
    }
  }

  console.log(`\n--- Results ---`);
  console.log(`Matched: ${matched}`);
  console.log(`No match: ${failed}`);
  console.log(`Errors: ${errors}`);
  if (dryRun) console.log(`\n(Dry run — no changes made)`);

  await prisma.$disconnect();
}

main();
