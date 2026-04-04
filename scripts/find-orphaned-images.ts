/**
 * Find orphaned dish images in public/dishes/ that no longer have
 * corresponding dishes in the database.
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
    const dishes = await prisma.dish.findMany({ select: { name: true } });
    const slugs = new Set(
      dishes.map((d: { name: string }) =>
        d.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
      )
    );

    const dishesDir = path.resolve(__dirname, "../public/dishes");
    const images = fs
      .readdirSync(dishesDir)
      .filter((f: string) => /\.(jpg|png|webp)$/i.test(f));

    const orphaned = images.filter((img: string) => {
      const slug = img
        .replace(/-v2\.(jpg|png|webp)$/i, "")
        .replace(/\.(jpg|png|webp)$/i, "");
      return !slugs.has(slug);
    });

    console.log(`Total dishes in DB: ${dishes.length}`);
    console.log(`Total images on disk: ${images.length}`);
    console.log(`Orphaned images: ${orphaned.length}`);

    if (orphaned.length > 0) {
      console.log("\n--- Orphaned images ---");
      for (const f of orphaned) {
        console.log(`  ${f}`);
      }
    }

    // If --delete flag, remove orphaned files
    if (process.argv.includes("--delete")) {
      console.log("\n--- Deleting orphaned images ---");
      let deleted = 0;
      for (const f of orphaned) {
        const fp = path.join(dishesDir, f);
        fs.unlinkSync(fp);
        deleted++;
      }
      console.log(`Deleted ${deleted} orphaned image files.`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
