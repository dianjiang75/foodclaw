/**
 * Nightly crawl script: re-queues crawl jobs for stale restaurants.
 * Usage: npx tsx -r tsconfig-paths/register scripts/nightly-crawl.ts
 */
import "dotenv/config";

async function main() {
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
