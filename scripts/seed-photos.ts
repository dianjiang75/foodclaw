/**
 * Add placeholder food photos to all dishes using Unsplash source API.
 * Usage: npx tsx scripts/seed-photos.ts
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Map common dish keywords to good Unsplash search terms
const PHOTO_TERMS: Record<string, string> = {
  pad_thai: "pad+thai+food",
  curry: "curry+food",
  burrito: "burrito+food",
  taco: "tacos+mexican+food",
  pizza: "pizza+food",
  sushi: "sushi+japanese+food",
  ramen: "ramen+noodle+food",
  salad: "salad+food",
  burger: "burger+food",
  pasta: "pasta+italian+food",
  soup: "soup+food",
  steak: "steak+food",
  chicken: "chicken+dish+food",
  rice: "rice+bowl+food",
  noodle: "noodles+food",
  poke: "poke+bowl+food",
  sandwich: "sandwich+food",
  ice_cream: "ice+cream+dessert",
  tiramisu: "tiramisu+dessert",
  churros: "churros+dessert",
  falafel: "falafel+food",
  gyoza: "dumplings+food",
  pho: "pho+vietnamese+food",
  bibimbap: "bibimbap+korean+food",
  default: "food+dish+restaurant",
};

function getPhotoUrl(dishName: string, index: number): string {
  const nameLower = dishName.toLowerCase();
  let term = PHOTO_TERMS.default;

  for (const [key, value] of Object.entries(PHOTO_TERMS)) {
    if (nameLower.includes(key.replace(/_/g, " ")) || nameLower.includes(key)) {
      term = value;
      break;
    }
  }

  // Use Unsplash source API with a unique sig per dish for variety
  return `https://images.unsplash.com/photo-food?w=800&h=500&fit=crop&q=80&sig=${index}&fm=jpg`;
}

// Curated food photos from Unsplash, keyed by dish type for accurate matching
const PHOTOS_BY_TYPE: Record<string, string[]> = {
  pizza: [
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&h=500&fit=crop",
  ],
  salad: [
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=500&fit=crop",
  ],
  pasta: [
    "https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800&h=500&fit=crop",
  ],
  burger: [
    "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=800&h=500&fit=crop",
  ],
  sushi: [
    "https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&h=500&fit=crop",
  ],
  taco: [
    "https://images.unsplash.com/photo-1569058242567-93de6f36f8e6?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=800&h=500&fit=crop",
  ],
  ramen: [
    "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=800&h=500&fit=crop",
  ],
  pho: [
    "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800&h=500&fit=crop",
  ],
  noodle: [
    "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=800&h=500&fit=crop",
  ],
  curry: [
    "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=800&h=500&fit=crop",
  ],
  soup: [
    "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&h=500&fit=crop",
  ],
  steak: [
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=500&fit=crop",
  ],
  chicken: [
    "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=800&h=500&fit=crop",
  ],
  rice: [
    "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800&h=500&fit=crop",
  ],
  poke: [
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1580822184713-fc5400e7fe10?w=800&h=500&fit=crop",
  ],
  ice_cream: [
    "https://images.unsplash.com/photo-1559847844-5315695dadae?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=800&h=500&fit=crop",
  ],
  matcha: [
    "https://images.unsplash.com/photo-1515823064-d6e0c04616a7?w=800&h=500&fit=crop",
  ],
  tiramisu: [
    "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=800&h=500&fit=crop",
  ],
  churros: [
    "https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=800&h=500&fit=crop",
  ],
  dumpling: [
    "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=800&h=500&fit=crop",
  ],
  gyoza: [
    "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=800&h=500&fit=crop",
  ],
  falafel: [
    "https://images.unsplash.com/photo-1593001874117-c99c800e3eb7?w=800&h=500&fit=crop",
  ],
  sandwich: [
    "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&h=500&fit=crop",
  ],
  burrito: [
    "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=800&h=500&fit=crop",
  ],
  pancake: [
    "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&h=500&fit=crop",
  ],
  thai: [
    "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=800&h=500&fit=crop",
  ],
  bibimbap: [
    "https://images.unsplash.com/photo-1553163147-622ab57be1c7?w=800&h=500&fit=crop",
  ],
  guacamole: [
    "https://images.unsplash.com/photo-1615870216519-2f9fa575fa5c?w=800&h=500&fit=crop",
  ],
  miso: [
    "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&h=500&fit=crop",
  ],
  tempura: [
    "https://images.unsplash.com/photo-1581184953963-d15972933db1?w=800&h=500&fit=crop",
  ],
  edamame: [
    "https://images.unsplash.com/photo-1564834744159-ff0ea41ba4b9?w=800&h=500&fit=crop",
  ],
  salmon: [
    "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&h=500&fit=crop",
  ],
  bruschetta: [
    "https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=800&h=500&fit=crop",
  ],
  risotto: [
    "https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=800&h=500&fit=crop",
  ],
  caprese: [
    "https://images.unsplash.com/photo-1608897013039-887f21d8c804?w=800&h=500&fit=crop",
  ],
  horchata: [
    "https://images.unsplash.com/photo-1541658016709-82535e94bc69?w=800&h=500&fit=crop",
  ],
};

// Fallback photos for dishes that don't match any keyword
const FALLBACK_PHOTOS = [
  "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&h=500&fit=crop",
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=500&fit=crop",
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=500&fit=crop",
  "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=800&h=500&fit=crop",
  "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&h=500&fit=crop",
];

/**
 * Find the best matching photo for a dish name by checking keywords.
 */
function matchPhotoForDish(dishName: string, index: number): string {
  const nameLower = dishName.toLowerCase();

  // Check each keyword against the dish name
  for (const [keyword, photos] of Object.entries(PHOTOS_BY_TYPE)) {
    const searchTerm = keyword.replace(/_/g, " ");
    if (nameLower.includes(searchTerm) || nameLower.includes(keyword)) {
      // Pick from available photos for this type (rotate if multiple)
      return photos[index % photos.length];
    }
  }

  // Fallback: cycle through generic food photos
  return FALLBACK_PHOTOS[index % FALLBACK_PHOTOS.length];
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
    const photoUrl = matchPhotoForDish(dish.name, i);

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
