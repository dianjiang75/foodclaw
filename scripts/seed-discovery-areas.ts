/**
 * Seeds initial discovery areas for nightly clawing.
 * Manhattan only for now.
 *
 * Usage: npx tsx scripts/seed-discovery-areas.ts
 */
import "dotenv/config";

const AREAS = [
  // ── Manhattan ──────────────────────────────────────────────────────
  { name: "Midtown Manhattan", latitude: 40.7549, longitude: -73.9840, radiusMiles: 0.5, priority: 1 },
  { name: "Lower East Side", latitude: 40.7150, longitude: -73.9843, radiusMiles: 0.4, priority: 2 },
  { name: "East Village", latitude: 40.7265, longitude: -73.9815, radiusMiles: 0.3, priority: 2 },
  { name: "West Village / Greenwich", latitude: 40.7336, longitude: -74.0027, radiusMiles: 0.3, priority: 2 },
  { name: "Chelsea / Flatiron", latitude: 40.7432, longitude: -73.9960, radiusMiles: 0.4, priority: 2 },
  { name: "Upper West Side", latitude: 40.7870, longitude: -73.9754, radiusMiles: 0.5, priority: 3 },
  { name: "Upper East Side", latitude: 40.7736, longitude: -73.9566, radiusMiles: 0.5, priority: 3 },
  { name: "Harlem", latitude: 40.8116, longitude: -73.9465, radiusMiles: 0.5, priority: 3 },
  { name: "Chinatown / Little Italy", latitude: 40.7158, longitude: -73.9970, radiusMiles: 0.25, priority: 1 },
  { name: "SoHo / NoLita", latitude: 40.7233, longitude: -73.9985, radiusMiles: 0.3, priority: 2 },
  { name: "Financial District", latitude: 40.7075, longitude: -74.0089, radiusMiles: 0.4, priority: 3 },
  { name: "Hell's Kitchen", latitude: 40.7638, longitude: -73.9918, radiusMiles: 0.4, priority: 2 },
  { name: "Koreatown / Herald Square", latitude: 40.7481, longitude: -73.9872, radiusMiles: 0.25, priority: 1 },
  { name: "Washington Heights", latitude: 40.8417, longitude: -73.9393, radiusMiles: 0.5, priority: 3 },
  { name: "NoHo / Bowery", latitude: 40.7260, longitude: -73.9929, radiusMiles: 0.25, priority: 2 },
  { name: "Murray Hill / Curry Hill", latitude: 40.7488, longitude: -73.9780, radiusMiles: 0.25, priority: 2 },
  { name: "Inwood", latitude: 40.8677, longitude: -73.9212, radiusMiles: 0.4, priority: 3 },

  // ── Brooklyn ───────────────────────────────────────────────────────
  { name: "Williamsburg", latitude: 40.7081, longitude: -73.9571, radiusMiles: 0.4, priority: 1 },
  { name: "Park Slope / Gowanus", latitude: 40.6710, longitude: -73.9814, radiusMiles: 0.4, priority: 2 },
  { name: "Bushwick", latitude: 40.6944, longitude: -73.9213, radiusMiles: 0.4, priority: 3 },
  { name: "Carroll Gardens / Cobble Hill", latitude: 40.6795, longitude: -73.9991, radiusMiles: 0.3, priority: 2 },
  { name: "DUMBO / Brooklyn Heights", latitude: 40.7033, longitude: -73.9903, radiusMiles: 0.3, priority: 2 },
  { name: "Fort Greene / Clinton Hill", latitude: 40.6882, longitude: -73.9718, radiusMiles: 0.35, priority: 3 },
  { name: "Prospect Heights / Crown Heights", latitude: 40.6775, longitude: -73.9619, radiusMiles: 0.4, priority: 3 },
  { name: "Sunset Park", latitude: 40.6454, longitude: -74.0104, radiusMiles: 0.4, priority: 2 },
  { name: "Greenpoint", latitude: 40.7282, longitude: -73.9514, radiusMiles: 0.35, priority: 2 },
  { name: "Bay Ridge", latitude: 40.6340, longitude: -74.0286, radiusMiles: 0.4, priority: 3 },
  { name: "Flatbush / Ditmas Park", latitude: 40.6380, longitude: -73.9620, radiusMiles: 0.4, priority: 3 },

  // ── Queens ─────────────────────────────────────────────────────────
  { name: "Flushing", latitude: 40.7580, longitude: -73.8306, radiusMiles: 0.4, priority: 1 },
  { name: "Astoria", latitude: 40.7724, longitude: -73.9301, radiusMiles: 0.4, priority: 2 },
  { name: "Jackson Heights", latitude: 40.7468, longitude: -73.8831, radiusMiles: 0.35, priority: 2 },
  { name: "Long Island City", latitude: 40.7425, longitude: -73.9566, radiusMiles: 0.35, priority: 3 },
  { name: "Woodside / Sunnyside", latitude: 40.7432, longitude: -73.9050, radiusMiles: 0.35, priority: 3 },
  { name: "Elmhurst", latitude: 40.7360, longitude: -73.8780, radiusMiles: 0.35, priority: 2 },
  { name: "Forest Hills", latitude: 40.7184, longitude: -73.8448, radiusMiles: 0.35, priority: 3 },
  { name: "Corona", latitude: 40.7450, longitude: -73.8602, radiusMiles: 0.3, priority: 3 },

  // ── Bronx ──────────────────────────────────────────────────────────
  { name: "Arthur Avenue / Belmont", latitude: 40.8554, longitude: -73.8880, radiusMiles: 0.3, priority: 2 },
  { name: "City Island", latitude: 40.8468, longitude: -73.7868, radiusMiles: 0.3, priority: 3 },

  // ── Staten Island ──────────────────────────────────────────────────
  { name: "St. George / Tompkinsville", latitude: 40.6433, longitude: -74.0769, radiusMiles: 0.35, priority: 3 },

  // ── Denver ─────────────────────────────────────────────────────────
  { name: "RiNo Denver", latitude: 39.7713, longitude: -104.9812, radiusMiles: 0.4, priority: 2 },
  { name: "LoHi Denver", latitude: 39.7585, longitude: -105.0072, radiusMiles: 0.35, priority: 2 },
  { name: "LoDo Denver", latitude: 39.7530, longitude: -104.9990, radiusMiles: 0.35, priority: 3 },
  { name: "Capitol Hill Denver", latitude: 39.7314, longitude: -104.9788, radiusMiles: 0.35, priority: 3 },
  { name: "South Broadway (SoBo) Denver", latitude: 39.7100, longitude: -104.9870, radiusMiles: 0.35, priority: 3 },
  { name: "Tennyson Street Denver", latitude: 39.7722, longitude: -105.0485, radiusMiles: 0.3, priority: 3 },
  { name: "Federal Boulevard Denver", latitude: 39.7150, longitude: -105.0250, radiusMiles: 0.4, priority: 2 },
  { name: "Stanley Marketplace / Aurora", latitude: 39.7558, longitude: -104.8910, radiusMiles: 0.35, priority: 3 },
];

async function main() {
  const { PrismaClient } = await import("../src/generated/prisma/client");
  const { PrismaPg } = await import("@prisma/adapter-pg");

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  let created = 0;
  let skipped = 0;

  for (const area of AREAS) {
    // Check if already exists (by name OR coordinate proximity ~1km)
    const existing = await prisma.discoveryArea.findFirst({
      where: {
        OR: [
          { name: { equals: area.name, mode: "insensitive" } },
          {
            latitude: { gte: area.latitude - 0.01, lte: area.latitude + 0.01 },
            longitude: { gte: area.longitude - 0.01, lte: area.longitude + 0.01 },
          },
        ],
      },
    });

    if (existing) {
      console.log(`  Skip (exists): ${area.name}`);
      skipped++;
      continue;
    }

    await prisma.discoveryArea.create({
      data: {
        name: area.name,
        latitude: area.latitude,
        longitude: area.longitude,
        radiusMiles: area.radiusMiles,
        priority: area.priority,
        discoveryIntervalDays: 7,
      },
    });
    console.log(`  Created: ${area.name} (priority ${area.priority})`);
    created++;
  }

  console.log(`\nDone: ${created} created, ${skipped} skipped`);
  await prisma.$disconnect();
}

main();
