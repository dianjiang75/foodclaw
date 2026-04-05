/**
 * Nightly full pipeline: Discovery → Menu Crawl → Delivery Scrape → Reviews
 *
 * Runs all pipeline phases sequentially. Each phase completes before the next starts.
 * Photo analysis is queued by crawl-worker on job completion (runs async in BullMQ).
 *
 * Pipeline:
 *   1. Discovery — find new restaurants via Google Places
 *   2. Menu Crawl — re-crawl stale restaurants (website + Google Photos)
 *   3. Delivery Scrape — scrape Uber Eats for per-item ratings + new dishes
 *   4. Review Aggregation — Google + Yelp + delivery data → dish summaries
 *   (Photo analysis runs async via BullMQ, triggered by crawl-worker completion)
 *
 * Usage: npx tsx scripts/nightly-crawl.ts [--skip-discovery] [--skip-delivery] [--skip-reviews]
 */
import "dotenv/config";
import { execSync } from "child_process";

const PHASE_TIMEOUT = 10 * 60 * 1000; // 10 min per phase

function runPhase(name: string, command: string, timeoutMs: number = PHASE_TIMEOUT): boolean {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  Phase: ${name}`);
  console.log(`${"=".repeat(60)}\n`);

  try {
    execSync(command, {
      cwd: __dirname + "/..",
      stdio: "inherit",
      env: { ...process.env, PATH: process.env.PATH },
      timeout: timeoutMs,
    });
    return true;
  } catch (err) {
    console.error(`\n⚠ ${name} failed:`, err instanceof Error ? err.message : err);
    console.error("Continuing to next phase...\n");
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const skipDiscovery = args.includes("--skip-discovery");
  const skipDelivery = args.includes("--skip-delivery");
  const skipReviews = args.includes("--skip-reviews");

  console.log(`\n🦞 FoodClaw Nightly Pipeline`);
  console.log(`   Started: ${new Date().toISOString()}`);
  console.log(`   Phases: ${[
    !skipDiscovery && "Discovery",
    "Menu Crawl",
    !skipDelivery && "Delivery Scrape",
    !skipReviews && "Reviews",
    "Photo Analysis (async)",
  ].filter(Boolean).join(" → ")}\n`);

  const results: Record<string, boolean> = {};

  // Phase 1: Discovery
  if (!skipDiscovery) {
    results.discovery = runPhase(
      "Discovery — finding new restaurants",
      "npx tsx scripts/nightly-discovery.ts",
      5 * 60 * 1000 // 5 min
    );
  }

  // Phase 2: Menu Crawl (queues jobs to BullMQ — workers must be running)
  {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`  Phase: Menu Crawl — refreshing stale restaurants`);
    console.log(`${"=".repeat(60)}\n`);

    const { PrismaClient } = await import("../src/generated/prisma/client");
    const { PrismaPg } = await import("@prisma/adapter-pg");
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
    const prisma = new PrismaClient({ adapter });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const staleRestaurants = await prisma.restaurant.findMany({
      where: {
        isActive: true,
        OR: [
          { lastMenuCrawl: null },
          { lastMenuCrawl: { lt: sevenDaysAgo } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true, googlePlaceId: true, name: true, lastMenuCrawl: true },
    });

    console.log(`Found ${staleRestaurants.length} restaurants needing re-crawl`);

    if (staleRestaurants.length > 0) {
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
      }
      console.log(`Queued ${staleRestaurants.length} crawl jobs.`);
      // Note: crawl-worker auto-chains photo analysis on completion
      await menuCrawlQueue.close();
    }

    results.crawl = true;
    await prisma.$disconnect();
  }

  // Phase 3: Delivery Scrape (Uber Eats per-item ratings)
  if (!skipDelivery) {
    results.delivery = runPhase(
      "Delivery Scrape — Uber Eats item ratings",
      "npx tsx -r tsconfig-paths/register scripts/nightly-delivery-scrape.ts --max 50",
      30 * 60 * 1000 // 30 min (headless browser is slow)
    );
  }

  // Phase 4: Review Aggregation (Google + Yelp + delivery data)
  if (!skipReviews) {
    results.reviews = runPhase(
      "Review Aggregation — Google + Yelp + delivery data",
      "npx tsx -r tsconfig-paths/register scripts/re-summarize-reviews.ts",
      20 * 60 * 1000 // 20 min
    );
  }

  // Summary
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  🦞 Nightly Pipeline Complete`);
  console.log(`  Finished: ${new Date().toISOString()}`);
  for (const [phase, success] of Object.entries(results)) {
    console.log(`    ${success ? "✅" : "❌"} ${phase}`);
  }
  console.log(`${"=".repeat(60)}\n`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
