/**
 * Add placeholder food photos to all dishes using Unsplash source API.
 * Usage: npx tsx scripts/seed-photos.ts
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Import the dish-specific photo mapping from seed-manhattan
// (duplicated here for standalone use; canonical source is seed-manhattan.ts)
import { matchPhoto } from "./seed-manhattan";

/**
 * Find the best matching photo for a dish name.
 * Uses dish-specific Unsplash photos from seed-manhattan.ts.
 */
function matchPhotoForDish(dishName: string): string {
  return matchPhoto(dishName);
}

async function main() {
  console.log("Adding keyword-matched photos to dishes...");

  const dishes = await prisma.dish.findMany({
    select: { id: true, name: true },
    where: { isAvailable: true },
  });

  let added = 0;
  let updated = 0;

  for (let i = 0; i < dishes.length; i++) {
    const dish = dishes[i];
    const photoUrl = matchPhotoForDish(dish.name);

    // Check if photo already exists
    const existing = await prisma.dishPhoto.findFirst({
      where: { dishId: dish.id },
    });

    if (!existing) {
      await prisma.dishPhoto.create({
        data: {
          dishId: dish.id,
          sourceUrl: photoUrl,
          sourcePlatform: "google_maps",
          analyzedAt: new Date(),
        },
      });
      added++;
    } else if (existing.sourceUrl !== photoUrl) {
      // Update existing photo if a better keyword match is found
      await prisma.dishPhoto.update({
        where: { id: existing.id },
        data: { sourceUrl: photoUrl },
      });
      updated++;
    }
  }

  console.log(`Done! Added ${added}, updated ${updated} photos (${dishes.length} dishes total).`);
  await prisma.$disconnect();
}

main().catch(console.error);
