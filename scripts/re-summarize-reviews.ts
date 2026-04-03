#!/usr/bin/env tsx
/**
 * Re-summarize ALL existing dish reviews using the updated Qwen 3 prompt.
 *
 * Fetches fresh reviews from Google/Yelp and regenerates summaries for every
 * active restaurant's dishes. Writes directly to DB (no BullMQ needed).
 *
 * Usage:
 *   npx tsx -r tsconfig-paths/register scripts/re-summarize-reviews.ts
 *   npx tsx -r tsconfig-paths/register scripts/re-summarize-reviews.ts --dry-run
 */
import "dotenv/config";

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const { PrismaClient } = await import("@/generated/prisma/client");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const { aggregateReviews } = await import("../src/lib/agents/review-aggregator/index");

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  try {
    const restaurants = await prisma.restaurant.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        googlePlaceId: true,
        yelpBusinessId: true,
        _count: { select: { dishes: true } },
      },
      orderBy: { name: "asc" },
    });

    const total = restaurants.length;
    let processed = 0;
    let dishesUpdated = 0;
    let errors = 0;

    console.log(`\nRe-summarizing reviews for ${total} restaurants${dryRun ? " (DRY RUN)" : ""}\n`);

    for (const r of restaurants) {
      processed++;
      const prefix = `[${processed}/${total}]`;

      if (r._count.dishes === 0) {
        console.log(`${prefix} ${r.name} — no dishes, skipping`);
        continue;
      }

      if (dryRun) {
        console.log(`${prefix} ${r.name} — ${r._count.dishes} dishes (would re-summarize)`);
        continue;
      }

      try {
        console.log(`${prefix} ${r.name} (${r._count.dishes} dishes)...`);
        const result = await aggregateReviews(
          r.id,
          r.googlePlaceId,
          r.yelpBusinessId,
        );
        dishesUpdated += result.dishSummaries.length;
        console.log(`  → ${result.dishSummaries.length} summaries updated (${result.totalReviewsFetched} reviews fetched)`);
      } catch (err) {
        errors++;
        console.error(`  → ERROR: ${(err as Error).message}`);
      }
    }

    console.log(`\n${"=".repeat(50)}`);
    console.log(`  Done: ${processed} restaurants, ${dishesUpdated} dish summaries updated, ${errors} errors`);
    console.log(`${"=".repeat(50)}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
