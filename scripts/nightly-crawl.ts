/**
 * Nightly crawl script: discovers NEW restaurants, then re-queues crawl jobs for stale ones.
 * Step 1: Run nightly-discovery.ts to find new restaurants via Google Places
 * Step 2: Re-crawl stale restaurants already in the DB
 *
 * Usage: npx tsx scripts/nightly-crawl.ts
 */
import "dotenv/config";
import { execSync } from "child_process";

async function main() {
  // Step 1: Discover new restaurants first
  console.log("=== Phase 1: Discovery — finding new restaurants ===\n");
  try {
    execSync("npx tsx scripts/nightly-discovery.ts", {
      cwd: __dirname + "/..",
      stdio: "inherit",
      env: { ...process.env, PATH: process.env.PATH },
      timeout: 5 * 60 * 1000, // 5 min max for discovery
    });
  } catch (err) {
    console.error("Discovery phase failed (continuing to re-crawl):", err instanceof Error ? err.message : err);
  }

  console.log("\n=== Phase 2: Re-crawl — refreshing stale restaurants ===\n");
  const { PrismaClient } = await import("../src/generated/prisma/client");
  const { PrismaPg } = await import("@prisma/adapter-pg");

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Find restaurants with stale menu data
  const staleRestaurants = await prisma.restaurant.findMany({
    where: {
      isActive: true,
      OR: [
        { lastMenuCrawl: null },
        { lastMenuCrawl: { lt: sevenDaysAgo } },
      ],
    },
    orderBy: { updatedAt: "desc" }, // Prioritize recently searched
    select: {
      id: true,
      googlePlaceId: true,
      name: true,
      lastMenuCrawl: true,
    },
  });

  console.log(`Found ${staleRestaurants.length} restaurants needing re-crawl`);

  if (staleRestaurants.length === 0) {
    console.log("Nothing to crawl.");
    await prisma.$disconnect();
    process.exit(0);
  }

  const { menuCrawlQueue } = await import("../workers/queues");

  for (const restaurant of staleRestaurants) {
    await menuCrawlQueue.add(
      "recrawl",
      { googlePlaceId: restaurant.googlePlaceId },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      }
    );
    console.log(
      `  Queued: ${restaurant.name} (last crawl: ${restaurant.lastMenuCrawl?.toISOString() ?? "never"})`
    );
  }

  console.log(`\n${staleRestaurants.length} crawl jobs queued.`);

  await menuCrawlQueue.close();
  await prisma.$disconnect();
  process.exit(0);
}

main();
