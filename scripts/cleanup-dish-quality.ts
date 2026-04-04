/**
 * Dish Quality Cleanup Script
 *
 * Based on the 2026-04-03 dish quality audit report. Performs three passes:
 *
 *   1. Category A — Delete non-food items (banchan, basic drinks, condiments,
 *      SEO spam, hotel perks, blog artifacts, add-ons, plain sides, etc.)
 *   2. Category B — Fix names (strip wine list numbers, delete blog/CMS
 *      artifacts, delete hotel perks, delete SEO spam, delete duplicates,
 *      strip HTML tags)
 *   3. Second pass — Run isDishWorthRecommending() against ALL remaining
 *      dishes and log warnings for anything that fails.
 *
 * Category C items are logged but NOT auto-fixed.
 *
 * Usage:
 *   npx tsx scripts/cleanup-dish-quality.ts [--dry-run]
 */
import "dotenv/config";

import { isDishWorthRecommending } from "../src/lib/agents/menu-crawler/clean-dish-name";

// ── Types ───────────────────────────────────────────────────────────────

interface Stats {
  deleted: number;
  renamed: number;
  skipped: number;
  flaggedByFilter: number;
}

// ── Category A: dishes to DELETE ────────────────────────────────────────

const CATEGORY_A_IDS: string[] = [
  // Banchan (free Korean sides)
  "08a643d5", "05e8a066", "80952851", "0c70ac39", "a8df05a8", "77109229",
  // Basic drinks
  "3db876be", "57079c9b", "f740e1ac", "31536748", "91c85161", "3e4938b6",
  "5a5f9e18", "d29c9b70", "cc76a323", "d8af8fd5", "09442248", "a1fd0519",
  "f9cd30e6", "c088fc91", "54fe82d2", "1a05216b", "1d0da0fb", "8ff8eca1",
  "367004d7", "f52855e8", "f005c191", "a6f048e3", "5c0200ec", "5fc3b15b",
  "6756e455", "6aa1e74a", "ddf49e98", "a49bec87", "fc9a0fb9", "3e230e2a",
  "5274a670", "da7f8fdf", "bd196d5c", "ab1510fd", "c79bca77", "386968ec",
  "b5b9a6b5",
  // Blog/CMS artifacts (Jin Mei Dumpling)
  "6140a315", "f18624ea", "b21365f9", "d3ea22d1", "efbbd7d2", "bd84a4ea",
  "37602f11", "b30513ac", "9c5da72e",
  // Blog/CMS artifacts (Shu Jiao Fu Zhou) — archives
  "ab62fd33", "16663f7e", "820e3c17", "891fc1bb", "95aca4ed", "6e5be3b2",
  "ed25caec", "837e6b53", "1dc99619",
  // Blog/CMS artifacts — categories (Jin Mei)
  "376b06e6", "0a121432", "f6709bd7", "9594d923", "d4353bd0", "de19278a",
  // Blog/CMS artifacts — categories (Shu Jiao Fu Zhou)
  "770f1102", "89671884", "ab403d43", "f80a9cde", "b1a18a77", "69755327",
  // Blog/CMS artifacts — recent comments
  "18dc2736", "f98e20b3", "4dde6ba1", "4641ac82",
  // Blog/CMS artifacts — recent posts (Jin Mei)
  "4ddc1cc9", "bc09516a", "7be62df9", "4e926e9e", "40f4e428",
  // Blog/CMS artifacts — recent posts (Shu Jiao Fu Zhou)
  "daccd3b1", "1ecda52b", "0d2a4ccd", "55942480", "57e5fc26",
  // Blog/CMS artifacts — Why People Love... (Shu Jiao Fu Zhou)
  "10249316", "4cd04824", "06d65996", "20b76c22", "9092d4b6",
  // Condiments
  "d4dacf8b", "781ece09", "836f1d30", "eb740fd2", "d9dfa426", "0b49e296",
  "1829236b",
  // Generic menu labels
  "6f9df879", "795de9a2", "da9f1ce8", "3c0e0234", "b44a3e8e", "c4c96d51",
  // HTML artifact
  "bd0722c3",
  // Hotel perks (Kimpton Hotel Eventi)
  "bd1501e0", "a5ee70c9", "d8259c1b", "dc517b6c", "6d29e8cf", "4c7b1023",
  "3d1189f8", "671e7cb5", "ffd2f6c1",
  // Non-food items
  "5369f68d",
  // Plain sides
  "208aa48e", "6e624297", "9477d0e6", "d529da90", "2a5caec3", "40864255",
  "f44d8192", "e9df3eec", "f4f903a9", "8616b178", "3aa1f449", "26782134",
  "fe761d76", "484329b7", "25512a64", "ea567bc9", "a7891b5c",
  // Price labels
  "e3ac2e3e", "8f54c22d",
  // Promotional text
  "6edd3c3f", "546f0735",
  // SEO spam/gambling injection (Mei Lai Wah)
  "a59feb19", "109ed76e", "e52d5573", "908ed59f", "ab13c993",
  // Side/add-on modifiers
  "b89dfec6", "704702dc", "9045daaa", "84afe832", "724cca4d", "6051c047",
  "0eced7cc", "f1fcae20", "947f2549", "ff3fa562", "b26a2b69", "ac646e1b",
  "37d5a3fe", "eb31de66", "b7a8ca7b", "d9cef86c",
];

// ── Category B: wine list IDs to FIX (strip leading number) ─────────

const WINE_LIST_FIX_IDS: string[] = [
  "8a250987", "d5985c09", "2ab08e46", "9b5dfe9f", "3cbb8155", "d2b31ef0",
  "f91cea60", "208bebcb", "030e48d3", "5ec4f792", "6ecf7209", "98b92b04",
  "9114cd18", "0f122dfd", "0b4ad3d9", "8dd692f2", "807536ec", "45ce582e",
  "cc4247ed", "a456cdad", "f78448c1", "4ac24928", "b3d05c42", "563e3833",
  "47850610", "4f4e2c3e", "60194bec", "fb5c303e", "0b82dc5f", "fc32a0da",
  "83b30380", "2a632afc", "431e87fd", "c8c91bd1", "3f4ca93e", "4f07639d",
  "246f73d2", "380c0275", "f1a44c5d", "73fcfe57", "1be340a7", "d20b8162",
  "5b455113", "329b8587", "ea7f2b64", "5a2a051c", "6e41a740", "6cce67db",
  "50a1bd2a", "38466317", "94bf2577", "eb574d9c", "41e52d04", "c38ca920",
  "993a93de", "78cb5bf9", "3bef1c99", "3d1a4578", "dc840705", "d0a1623c",
  "c38eebdb", "29e8be6d", "a5a9508a", "37d4b74a", "6f2303f3", "72c2f31f",
  "fd69cc28", "f8cfa3fa", "abd5964a", "c4754acd", "a6212fbb", "a08787fa",
  "913270d8", "3721f121", "49d280d2", "a04b6b48", "ce21812f", "d6a822e7",
  "65f9d38c", "2049e754", "c0a156d6", "f3ff99c7", "8b3a49dc", "8b320641",
  "3006dab1", "4545eddd", "9bb827c4", "b7afed22", "62fc27b2", "ea78e364",
  "402cfad6", "58b4b0f3", "07f845c2", "9771f3b0", "4143c063", "88683150",
  "547bcc08", "3c442f85", "0d2a0c20", "5db8ef9e", "aed4917d", "6757498c",
  "f5ea546e", "bf460fd9", "aa7ca94e", "88147683", "07b82c32", "4d2654ed",
  "4f42f1cf", "709005b2", "2225b7b4", "26ff4bc6", "15398ac2", "327e8a00",
  "9d92ad40", "4de2201d", "9add392a", "dc0f094a", "73357630", "7cf8649b",
  "df477677", "64a37840", "eeb0f512", "8d7b4ba7", "29c3f860", "e6eb9218",
  "fa26d663", "50d0f3a6", "ca75aa46", "631172a5", "d23e51ee", "ec70f274",
  "c2a5a80f", "3f14fbee", "100f42aa", "9fa10cbb", "9ebab3d0", "b9aa4b54",
  "04802652", "f47bcb3a", "fa8e7971", "5e292494", "dc83a3d6", "77291eb9",
  "df7394fd", "1a37d780", "7732ff34", "4e107ac2", "cc0a724d", "1b57dd86",
  "6c8c25c3", "0727ca87", "29be9a97", "2a758cfe", "00f67a30", "b5dc5ff2",
  "cebede94", "a6b4ef63", "f4f2ec85", "343ad401", "a14233b3", "241f0aab",
  "155b11c1", "130da3a5", "396022cf", "0dddf16d", "47e47398", "69cf1162",
  "6d51ea89", "ae80d8fe", "bf005798", "0c7223ea", "8c65aed7", "f9251fa9",
  "8cd987e7", "39a369a2", "53812365", "69ecba06", "3c44219b", "2924aedd",
  "433bd420", "398c3637", "bf556334", "aa1de67e", "4baf799c", "43400c55",
  "beac0143", "625a94e3", "73bbe2ac", "eb37b7c3", "82e028bb", "53fcc92d",
  "09456b18", "5d57e92f", "367bcd48", "ff29680d", "f7741828", "caea33c9",
  "a88d89fa", "81affff6", "f768a8fd", "7c0070e4", "9238f988", "57754998",
  "89fb19da", "e66fdcfb", "414bcc02", "bfcbb124", "0753cbc6", "aec02de0",
  "37a13ae7", "0f5e78e3", "d115f0bc", "e568878a", "679381f7", "f12ce83d",
  "d59f8cf7", "fba6521e", "b09b1d17",
];

// ── Category B: duplicates to DELETE (keep the first, delete the rest) ──

const DUPLICATE_DELETE_IDS: string[] = [
  "d169ae32", // Black Cocoa Tiramisu (keep b5aabaa9)
  "43f9211e", // Chrysanthemum Salad (keep 90601265)
  "59b452cb", // Olive Oil Cake (keep d942e192)
  "a9304b44", // Adobada (keep fe589a1a)
  "b25082c5", // Aguas Frescas (keep ab992338)
  "a1dfa3e8", // Bottled Sodas (keep 369bed60)
  "786d6bb4", // Carne Asada (keep dbd64778)
  "39da8d83", // Chips y Guacamole (keep 5b7cb7d0)
  "d0d399d3", // Chips y Salsa (keep fa807bf3)
  "4b9fc5cb", // Especial (keep 8876ddc2)
  "4711c3ba", // Mexican Sodas (keep 3b533229)
  "50d3cd96", // Nopal (keep 21983ece)
  "96f5914c", // Nopal Plate (keep 87639bbe)
  "83149b1f", // Pollo Asado (keep d2d7f00b)
  "17c4b839", // Pot of Mussels (keep f81e8d12)
  "fb5b07dd", // The Smith Burger (keep 718ef391)
];

// ── Category C: just log, no auto-fix ───────────────────────────────

const CATEGORY_C = [
  { id: "cc7e28ea", name: "Cuttle Fish Taco Ball", restaurant: "Golden Unicorn", concern: "cuisine mismatch" },
  { id: "0648a4e8", name: "Minced Chicken Meat with Lettuce Taco", restaurant: "Golden Unicorn", concern: "cuisine mismatch" },
  { id: "97aa1c9e", name: "Vegetable Bibimbap", restaurant: "The Smith", concern: "cuisine mismatch" },
];

// ── Category B: items to skip (log only, not auto-fix) ──────────────
// These are flagged in the report but need manual judgment.

const CATEGORY_B_SKIP = [
  { id: "f0a69ecf", name: "16 oz Dry Aged Bone-In NY Strip", reason: "Starts with portion size" },
  { id: "429f536b", name: "Milan Nestarec 'Forks & Knives'...", reason: "Name too long (wine)" },
  { id: "470a9440", name: "Ruth Lewandowski 'Stock Pot'...", reason: "Name too long (wine)" },
  { id: "97880c27", name: "Classic", reason: "Too vague (Dante West Village)" },
  { id: "45e632cb", name: "Selection of assorted pastries...", reason: "Name too long (marketing copy)" },
  { id: "971f26d0", name: "ETERNALLY GRAPEFRUIT...", reason: "Name too long (cocktail)" },
  { id: "54fac669", name: "Plain", reason: "Too vague (Prince Street Pizza)" },
  { id: "8a250062", name: "Classic", reason: "Too vague (Rubirosa)" },
  { id: "93879662", name: "Original", reason: "Too vague (Scarr's Pizza)" },
  { id: "d079a9e4", name: "Classic", reason: "Too vague (The Smith)" },
  { id: "9f35a54a", name: "Classic Green / Green Mint /...", reason: "Name too long (tea list)" },
];

// ── Helpers ─────────────────────────────────────────────────────────

/**
 * Strip leading wine-list reference number and separator.
 *
 * Patterns seen in the audit:
 *   "5110 / Jean Foillard Fleurie 2022"  -> "Jean Foillard Fleurie 2022"
 *   "5110 | Jean Foillard Fleurie 2022"  -> "Jean Foillard Fleurie 2022"
 *   "1924 Bleu"                          -> "Bleu" (4-digit code then space)
 *   "3205 Gewurtztraminer / ..."         -> "Gewurtztraminer / ..."
 *
 * The pattern: starts with digits, then optional whitespace,
 * then `/` or `|`, then whitespace, then the real name.
 * Or: starts with exactly 4 digits + space + word (no separator).
 */
function stripWineListNumber(name: string): string {
  // Pattern 1: "3002 / Sauvignon Blanc / ..." or "5110 | ..."
  const withSeparator = name.replace(/^\d+\s*[/|]\s*/, "");
  if (withSeparator !== name) return withSeparator.trim();

  // Pattern 2: "1924 Bleu" or "3205 Gewurtztraminer / ..."
  const withoutSeparator = name.replace(/^\d{4}\s+/, "");
  if (withoutSeparator !== name) return withoutSeparator.trim();

  return name;
}

/**
 * Strip HTML tags from a dish name.
 */
function stripHtmlTags(name: string): string {
  return name.replace(/<[^>]*>/g, "").trim();
}

/**
 * Resolve a partial UUID prefix (from the audit report "08a643d5...")
 * against the actual full UUIDs in the database.
 */
function findFullId(prefix: string, allIds: Map<string, string>): string | null {
  // Check if we already have it as a direct match
  if (allIds.has(prefix)) return prefix;

  // Otherwise, prefix search
  for (const [fullId] of allIds) {
    if (fullId.startsWith(prefix)) return fullId;
  }
  return null;
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");

  console.log("\n========================================");
  console.log("  Dish Quality Cleanup Script");
  console.log("  Based on 2026-04-03 audit report");
  console.log(`  Mode: ${dryRun ? "DRY RUN (no changes)" : "LIVE"}`);
  console.log(`  Started: ${new Date().toISOString()}`);
  console.log("========================================\n");

  // ── Initialize Prisma ──
  const { PrismaClient } = await import("../src/generated/prisma/client");
  const { PrismaPg } = await import("@prisma/adapter-pg");

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const stats: Stats = { deleted: 0, renamed: 0, skipped: 0, flaggedByFilter: 0 };

  try {
    // ── Pre-fetch all dish IDs for prefix matching ──
    console.log("[INIT] Fetching all dish IDs for prefix matching...");
    const allDishes = await prisma.dish.findMany({
      select: { id: true, name: true, category: true, restaurantId: true },
    });
    const idMap = new Map<string, string>();
    for (const d of allDishes) {
      idMap.set(d.id, d.name);
    }
    console.log(`[INIT] Found ${allDishes.length} dishes in database.\n`);

    // ════════════════════════════════════════════════════════════════
    // PASS 1: Category A — DELETE
    // ════════════════════════════════════════════════════════════════
    console.log("── CATEGORY A: DELETE non-food items ──────────────────\n");

    for (const prefix of CATEGORY_A_IDS) {
      const fullId = findFullId(prefix, idMap);
      if (!fullId) {
        console.log(`  [SKIP] ${prefix}... — not found (already deleted?)`);
        stats.skipped++;
        continue;
      }

      const dishName = idMap.get(fullId) || "(unknown)";

      if (dryRun) {
        console.log(`  [DRY-RUN] Would delete: ${fullId} "${dishName}"`);
        stats.deleted++;
        continue;
      }

      try {
        // Delete related records first to avoid FK violations
        // (Even though schema has onDelete: Cascade, being explicit is safer
        //  for partial-cascade scenarios and logging)
        await prisma.communityFeedback.deleteMany({ where: { dishId: fullId } });
        await prisma.userFavorite.deleteMany({ where: { dishId: fullId } });
        await prisma.reviewSummary.deleteMany({ where: { dishId: fullId } });
        await prisma.dishPhoto.deleteMany({ where: { dishId: fullId } });
        await prisma.dish.delete({ where: { id: fullId } });

        console.log(`  [DELETED] ${fullId} "${dishName}"`);
        stats.deleted++;
        idMap.delete(fullId);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("Record to delete does not exist")) {
          console.log(`  [SKIP] ${fullId} "${dishName}" — already deleted`);
          stats.skipped++;
        } else {
          console.error(`  [ERROR] Failed to delete ${fullId}: ${msg}`);
        }
      }
    }

    // ════════════════════════════════════════════════════════════════
    // PASS 2: Category B — FIX names / DELETE duplicates & junk
    // ════════════════════════════════════════════════════════════════
    console.log("\n── CATEGORY B: FIX / DELETE ────────────────────────────\n");

    // 2a. Delete duplicates
    console.log("  -- Deleting duplicates --\n");
    for (const prefix of DUPLICATE_DELETE_IDS) {
      const fullId = findFullId(prefix, idMap);
      if (!fullId) {
        console.log(`  [SKIP] ${prefix}... — not found (already deleted?)`);
        stats.skipped++;
        continue;
      }

      const dishName = idMap.get(fullId) || "(unknown)";

      if (dryRun) {
        console.log(`  [DRY-RUN] Would delete duplicate: ${fullId} "${dishName}"`);
        stats.deleted++;
        continue;
      }

      try {
        await prisma.communityFeedback.deleteMany({ where: { dishId: fullId } });
        await prisma.userFavorite.deleteMany({ where: { dishId: fullId } });
        await prisma.reviewSummary.deleteMany({ where: { dishId: fullId } });
        await prisma.dishPhoto.deleteMany({ where: { dishId: fullId } });
        await prisma.dish.delete({ where: { id: fullId } });

        console.log(`  [DELETED duplicate] ${fullId} "${dishName}"`);
        stats.deleted++;
        idMap.delete(fullId);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("Record to delete does not exist")) {
          console.log(`  [SKIP] ${fullId} "${dishName}" — already deleted`);
          stats.skipped++;
        } else {
          console.error(`  [ERROR] Failed to delete ${fullId}: ${msg}`);
        }
      }
    }

    // 2b. Fix wine list names (strip leading number)
    console.log("\n  -- Fixing wine list names (strip leading number) --\n");
    for (const prefix of WINE_LIST_FIX_IDS) {
      const fullId = findFullId(prefix, idMap);
      if (!fullId) {
        console.log(`  [SKIP] ${prefix}... — not found (already deleted?)`);
        stats.skipped++;
        continue;
      }

      const currentName = idMap.get(fullId) || "";
      let newName = stripWineListNumber(currentName);

      // Also strip any HTML tags just in case
      newName = stripHtmlTags(newName);

      if (newName === currentName) {
        console.log(`  [SKIP] ${fullId} "${currentName}" — name already clean`);
        stats.skipped++;
        continue;
      }

      if (dryRun) {
        console.log(`  [DRY-RUN] Would rename: "${currentName}" -> "${newName}"`);
        stats.renamed++;
        continue;
      }

      try {
        await prisma.dish.update({
          where: { id: fullId },
          data: { name: newName },
        });
        console.log(`  [RENAMED] "${currentName}" -> "${newName}"`);
        stats.renamed++;
        idMap.set(fullId, newName);
      } catch (err: unknown) {
        console.error(`  [ERROR] Failed to rename ${fullId}: ${err instanceof Error ? err.message : err}`);
      }
    }

    // 2c. Log skipped Category B items (need manual review)
    console.log("\n  -- Category B: Skipped (needs manual judgment) --\n");
    for (const item of CATEGORY_B_SKIP) {
      console.log(`  [MANUAL] ${item.id}... "${item.name}" — ${item.reason}`);
      stats.skipped++;
    }

    // ════════════════════════════════════════════════════════════════
    // PASS 3: Category C — Log only
    // ════════════════════════════════════════════════════════════════
    console.log("\n── CATEGORY C: FLAG FOR REVIEW ─────────────────────────\n");

    for (const item of CATEGORY_C) {
      const fullId = findFullId(item.id, idMap);
      const status = fullId ? "EXISTS" : "NOT FOUND";
      console.log(`  [${status}] ${item.id}... "${item.name}" @ ${item.restaurant} — ${item.concern}`);
      stats.skipped++;
    }

    // ════════════════════════════════════════════════════════════════
    // PASS 4: Second pass — isDishWorthRecommending() filter
    // ════════════════════════════════════════════════════════════════
    console.log("\n── SECOND PASS: isDishWorthRecommending() filter ──────\n");

    // Re-fetch remaining dishes (some may have been deleted above)
    const remainingDishes = dryRun
      ? allDishes
      : await prisma.dish.findMany({
          select: { id: true, name: true, category: true },
        });

    let filterFailCount = 0;
    for (const dish of remainingDishes) {
      // Skip dishes we already deleted in this run (dry-run only check)
      if (dryRun && !idMap.has(dish.id)) continue;

      if (!isDishWorthRecommending(dish.name, dish.category)) {
        console.log(`  [WARN] Dish fails filter: ${dish.id} "${dish.name}" (category: ${dish.category || "null"})`);
        filterFailCount++;
      }
    }

    stats.flaggedByFilter = filterFailCount;
    console.log(`\n  Total flagged by isDishWorthRecommending(): ${filterFailCount}`);

    // ════════════════════════════════════════════════════════════════
    // Summary
    // ════════════════════════════════════════════════════════════════
    console.log("\n========================================");
    console.log("  SUMMARY");
    console.log("========================================");
    console.log(`  Deleted:              ${stats.deleted}`);
    console.log(`  Renamed:              ${stats.renamed}`);
    console.log(`  Skipped:              ${stats.skipped}`);
    console.log(`  Flagged by filter:    ${stats.flaggedByFilter}`);
    console.log(`  Mode:                 ${dryRun ? "DRY RUN" : "LIVE"}`);
    console.log("========================================\n");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
