/**
 * Remove entries from generated-photos.json (and public/admin copy)
 * for dishes that no longer exist in the database.
 */
import "dotenv/config";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const { PrismaClient } = await import("../src/generated/prisma/client");
  const { PrismaPg } = await import("@prisma/adapter-pg");

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    // Get all dish names from DB
    const dishes = await prisma.dish.findMany({ select: { name: true } });
    const dishNames = new Set(dishes.map((d: { name: string }) => d.name));

    const jsonFiles = [
      path.resolve(__dirname, "generated-photos.json"),
      path.resolve(__dirname, "../public/admin/generated-photos.json"),
    ];

    for (const jsonPath of jsonFiles) {
      if (!fs.existsSync(jsonPath)) {
        console.log(`[SKIP] ${jsonPath} — not found`);
        continue;
      }

      const raw = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
      const before = Object.keys(raw).length;

      const cleaned: Record<string, string> = {};
      const removed: string[] = [];

      for (const [name, photoPath] of Object.entries(raw)) {
        if (dishNames.has(name)) {
          cleaned[name] = photoPath as string;
        } else {
          removed.push(name);
        }
      }

      const after = Object.keys(cleaned).length;

      fs.writeFileSync(jsonPath, JSON.stringify(cleaned, null, 2) + "\n");

      console.log(`[UPDATED] ${path.relative(process.cwd(), jsonPath)}`);
      console.log(`  Before: ${before} entries`);
      console.log(`  After:  ${after} entries`);
      console.log(`  Removed: ${removed.length} entries`);

      if (removed.length > 0 && removed.length <= 50) {
        for (const name of removed) {
          console.log(`    - "${name}"`);
        }
      } else if (removed.length > 50) {
        for (const name of removed.slice(0, 30)) {
          console.log(`    - "${name}"`);
        }
        console.log(`    ... and ${removed.length - 30} more`);
      }
      console.log();
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
