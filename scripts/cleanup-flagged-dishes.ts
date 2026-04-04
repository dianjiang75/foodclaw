/**
 * Cleanup Flagged Dishes Script
 *
 * Loads all dishes from the DB, runs isDishWorthRecommending() on each,
 * and deletes any that fail the quality filter.
 *
 * Usage:
 *   npx tsx scripts/cleanup-flagged-dishes.ts --dry-run   # preview only
 *   npx tsx scripts/cleanup-flagged-dishes.ts              # delete for real
 */
import "dotenv/config";
import * as fs from "fs";
import * as path from "path";

import { isDishWorthRecommending } from "../src/lib/agents/menu-crawler/clean-dish-name";

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");

  console.log("\n========================================");
  console.log("  Cleanup Flagged Dishes");
  console.log(`  Mode: ${dryRun ? "DRY RUN (no changes)" : "LIVE"}`);
  console.log(`  Started: ${new Date().toISOString()}`);
  console.log("========================================\n");

  const { PrismaClient } = await import("../src/generated/prisma/client");
  const { PrismaPg } = await import("@prisma/adapter-pg");

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    // Fetch all dishes
    const allDishes = await prisma.dish.findMany({
      select: { id: true, name: true, category: true, restaurantId: true },
    });
    console.log(`Total dishes in DB: ${allDishes.length}\n`);

    // Find dishes that fail the quality filter
    const flagged = allDishes.filter(
      (d: { name: string; category: string | null }) =>
        !isDishWorthRecommending(d.name, d.category)
    );

    console.log(`Dishes failing isDishWorthRecommending(): ${flagged.length}\n`);

    if (flagged.length === 0) {
      console.log("Nothing to clean up. All dishes pass the quality filter.");
      return;
    }

    // Group by reason for reporting
    const byCategory: Record<string, Array<{ id: string; name: string; category: string | null }>> = {};
    for (const dish of flagged) {
      const cat = dish.category || "(no category)";
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(dish);
    }

    console.log("--- Flagged dishes by category ---\n");
    for (const [cat, dishes] of Object.entries(byCategory).sort((a, b) => b[1].length - a[1].length)) {
      console.log(`  [${cat}] (${dishes.length} dishes)`);
      for (const d of dishes.slice(0, 10)) {
        console.log(`    - "${d.name}" (${d.id.slice(0, 8)}...)`);
      }
      if (dishes.length > 10) {
        console.log(`    ... and ${dishes.length - 10} more`);
      }
    }

    if (dryRun) {
      console.log(`\n[DRY RUN] Would delete ${flagged.length} dishes. Run without --dry-run to execute.`);
      return;
    }

    // Delete flagged dishes (cascade handles related records)
    console.log(`\n--- Deleting ${flagged.length} flagged dishes ---\n`);

    let deleted = 0;
    let errors = 0;

    for (const dish of flagged) {
      try {
        // Explicit cascade for safety
        await prisma.communityFeedback.deleteMany({ where: { dishId: dish.id } });
        await prisma.userFavorite.deleteMany({ where: { dishId: dish.id } });
        await prisma.reviewSummary.deleteMany({ where: { dishId: dish.id } });
        await prisma.dishPhoto.deleteMany({ where: { dishId: dish.id } });
        await prisma.dish.delete({ where: { id: dish.id } });
        deleted++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("Record to delete does not exist")) {
          // Already deleted, skip
        } else {
          console.error(`  [ERROR] Failed to delete ${dish.id} "${dish.name}": ${msg}`);
          errors++;
        }
      }
    }

    console.log(`\n========================================`);
    console.log(`  SUMMARY`);
    console.log(`========================================`);
    console.log(`  Flagged:   ${flagged.length}`);
    console.log(`  Deleted:   ${deleted}`);
    console.log(`  Errors:    ${errors}`);
    console.log(`========================================\n`);

    // Also clean up orphaned images and generated-photos.json after deletion
    console.log("--- Post-deletion: cleaning orphaned images ---\n");

    const remainingDishes = await prisma.dish.findMany({ select: { name: true } });
    const slugs = new Set(
      remainingDishes.map((d: { name: string }) =>
        d.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
      )
    );

    const dishesDir = path.resolve(__dirname, "../public/dishes");
    const images = fs.readdirSync(dishesDir).filter((f: string) => /\.(jpg|png|webp)$/i.test(f));

    let imgDeleted = 0;
    for (const img of images) {
      const slug = img.replace(/-v2\.(jpg|png|webp)$/i, "").replace(/\.(jpg|png|webp)$/i, "");
      if (!slugs.has(slug)) {
        fs.unlinkSync(path.join(dishesDir, img));
        imgDeleted++;
      }
    }
    console.log(`  Deleted ${imgDeleted} newly orphaned images.\n`);

    // Update generated-photos.json files
    const dishNames = new Set(remainingDishes.map((d: { name: string }) => d.name));
    const jsonFiles = [
      path.resolve(__dirname, "generated-photos.json"),
      path.resolve(__dirname, "../public/admin/generated-photos.json"),
    ];

    for (const jsonPath of jsonFiles) {
      if (!fs.existsSync(jsonPath)) continue;
      const raw = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
      const before = Object.keys(raw).length;
      const cleaned: Record<string, string> = {};
      for (const [name, photo] of Object.entries(raw)) {
        if (dishNames.has(name)) cleaned[name] = photo as string;
      }
      const after = Object.keys(cleaned).length;
      fs.writeFileSync(jsonPath, JSON.stringify(cleaned, null, 2) + "\n");
      console.log(`  ${path.relative(process.cwd(), jsonPath)}: ${before} -> ${after} entries (removed ${before - after})`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
