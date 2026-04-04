/**
 * One-time migration: clean all existing dish names, descriptions, and categories.
 *
 * Applies the cleanDishName/cleanDescription/cleanCategoryName pipeline to every dish,
 * updates in-place, merges duplicates that collapse to the same name.
 *
 * Usage: npx tsx scripts/clean-dish-names.ts [--dry-run] [--descriptions-only]
 */
import "dotenv/config";

import {
  cleanDishName,
  cleanCategoryName,
  cleanDescription,
} from "../src/lib/agents/menu-crawler/clean-dish-name";

interface Stats {
  total: number;
  namesCleaned: number;
  descriptionsCleaned: number;
  descriptionsNulled: number;
  categoriesCleaned: number;
  unchanged: number;
  deleted: number;
  merged: number;
  rejected: number;
  errors: number;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const descriptionsOnly = args.includes("--descriptions-only");

  console.log(`\nDish Cleanup Migration`);
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
  if (descriptionsOnly) console.log(`Scope: descriptions only`);
  console.log(`Started: ${new Date().toISOString()}\n`);

  const { PrismaClient } = await import("../src/generated/prisma/client");
  const { PrismaPg } = await import("@prisma/adapter-pg");

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const stats: Stats = {
    total: 0,
    namesCleaned: 0,
    descriptionsCleaned: 0,
    descriptionsNulled: 0,
    categoriesCleaned: 0,
    unchanged: 0,
    deleted: 0,
    merged: 0,
    rejected: 0,
    errors: 0,
  };

  try {
    const dishes = await prisma.dish.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        restaurantId: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    stats.total = dishes.length;
    console.log(`Found ${dishes.length} dishes to process.\n`);

    // Group by restaurant for per-restaurant dedup
    const byRestaurant = new Map<string, typeof dishes>();
    for (const dish of dishes) {
      const group = byRestaurant.get(dish.restaurantId) || [];
      group.push(dish);
      byRestaurant.set(dish.restaurantId, group);
    }

    for (const [restaurantId, restaurantDishes] of byRestaurant) {
      const cleanedMap = new Map<string, string>();

      for (const dish of restaurantDishes) {
        // ── Name + category cleaning (skip if --descriptions-only) ──
        let cleanedName = dish.name;
        let cleanedCategory: string | null = dish.category;
        let nameChanged = false;
        let categoryChanged = false;

        if (!descriptionsOnly) {
          const cn = cleanDishName(dish.name);
          if (!cn) {
            console.log(`  REJECT: "${dish.name}" (restaurant ${restaurantId})`);
            if (!dryRun) {
              await prisma.dish.delete({ where: { id: dish.id } });
            }
            stats.rejected++;
            stats.deleted++;
            continue;
          }
          cleanedName = cn;
          nameChanged = cleanedName !== dish.name;

          const cc = dish.category ? cleanCategoryName(dish.category) : null;
          cleanedCategory = cc;
          categoryChanged = cc !== dish.category;

          // Dedup by cleaned name within restaurant
          const dedupeKey = cleanedName.toLowerCase();
          const existingId = cleanedMap.get(dedupeKey);
          if (existingId) {
            console.log(
              `  MERGE: "${dish.name}" → duplicate of "${cleanedName}" (keeping ${existingId})`
            );
            if (!dryRun) {
              await prisma.dishPhoto.updateMany({
                where: { dishId: dish.id },
                data: { dishId: existingId },
              });
              await prisma.communityFeedback.updateMany({
                where: { dishId: dish.id },
                data: { dishId: existingId },
              });
              await prisma.userFavorite.updateMany({
                where: { dishId: dish.id },
                data: { dishId: existingId },
              });
              await prisma.dish.delete({ where: { id: dish.id } });
            }
            stats.merged++;
            stats.deleted++;
            continue;
          }
          cleanedMap.set(dedupeKey, dish.id);
        }

        // ── Description cleaning ──
        const cleanedDesc = dish.description
          ? cleanDescription(dish.description, cleanedName)
          : null;
        const descChanged = cleanedDesc !== dish.description;
        const descNulled = descChanged && cleanedDesc === null && dish.description !== null;

        // Check if anything changed
        if (!nameChanged && !categoryChanged && !descChanged) {
          stats.unchanged++;
          continue;
        }

        // Log changes
        if (nameChanged) {
          console.log(`  NAME:  "${dish.name}" → "${cleanedName}"`);
          stats.namesCleaned++;
        }
        if (categoryChanged) {
          console.log(`    CAT: "${dish.category}" → "${cleanedCategory}"`);
          stats.categoriesCleaned++;
        }
        if (descNulled) {
          console.log(`    DESC nulled: "${dish.description}"`);
          stats.descriptionsNulled++;
        } else if (descChanged) {
          console.log(`    DESC: "${dish.description?.slice(0, 60)}..." → "${cleanedDesc?.slice(0, 60)}..."`);
          stats.descriptionsCleaned++;
        }

        if (!dryRun) {
          try {
            const updateData: Record<string, unknown> = {};
            if (nameChanged) updateData.name = cleanedName;
            if (categoryChanged) updateData.category = cleanedCategory;
            if (descChanged) updateData.description = cleanedDesc;

            await prisma.dish.update({
              where: { id: dish.id },
              data: updateData,
            });
          } catch (err) {
            console.error(
              `  ERROR updating dish ${dish.id}: ${(err as Error).message}`
            );
            stats.errors++;
          }
        }
      }
    }

    console.log(`\n--- Results ---`);
    console.log(`Total dishes:       ${stats.total}`);
    console.log(`Names cleaned:      ${stats.namesCleaned}`);
    console.log(`Descs cleaned:      ${stats.descriptionsCleaned}`);
    console.log(`Descs nulled:       ${stats.descriptionsNulled}`);
    console.log(`Categories cleaned: ${stats.categoriesCleaned}`);
    console.log(`Unchanged:          ${stats.unchanged}`);
    console.log(`Merged dupes:       ${stats.merged}`);
    console.log(`Rejected junk:      ${stats.rejected}`);
    console.log(`Deleted total:      ${stats.deleted}`);
    console.log(`Errors:             ${stats.errors}`);
    if (dryRun) {
      console.log(`\n(Dry run — no changes. Run without --dry-run to apply.)`);
    }
  } catch (err) {
    console.error("Fatal error:", (err as Error).message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
