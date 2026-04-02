/**
 * Compute and store normalized macro embeddings for all dishes.
 * Uses pgvector's vector(4) column for fast cosine similarity search.
 *
 * Embedding: [cal_norm, protein_norm, carbs_norm, fat_norm]
 * Normalized using z-score standardization matching similarity/index.ts
 *
 * Usage: npx tsx scripts/compute-embeddings.ts
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Same stats as src/lib/similarity/index.ts MACRO_STATS
const STATS = {
  calories: { mean: 500, std: 250 },
  protein: { mean: 25, std: 15 },
  carbs: { mean: 45, std: 30 },
  fat: { mean: 20, std: 15 },
};

function computeEmbedding(cal: number, pro: number, carbs: number, fat: number): number[] {
  const vec = [
    (cal - STATS.calories.mean) / STATS.calories.std,
    (pro - STATS.protein.mean) / STATS.protein.std,
    (carbs - STATS.carbs.mean) / STATS.carbs.std,
    (fat - STATS.fat.mean) / STATS.fat.std,
  ];

  // L2 normalize
  const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  if (mag === 0) return [0, 0, 0, 0];
  return vec.map((v) => Math.round((v / mag) * 10000) / 10000);
}

async function main() {
  console.log("Computing macro embeddings...");

  const dishes = await prisma.dish.findMany({
    where: { caloriesMin: { not: null } },
    select: {
      id: true,
      caloriesMin: true,
      proteinMaxG: true,
      carbsMaxG: true,
      fatMaxG: true,
    },
  });

  let updated = 0;
  for (const dish of dishes) {
    const cal = dish.caloriesMin ?? 0;
    const pro = dish.proteinMaxG ? Number(dish.proteinMaxG) : 0;
    const carbs = dish.carbsMaxG ? Number(dish.carbsMaxG) : 0;
    const fat = dish.fatMaxG ? Number(dish.fatMaxG) : 0;

    const embedding = computeEmbedding(cal, pro, carbs, fat);
    const vecStr = `[${embedding.join(",")}]`;

    await prisma.$executeRaw`
      UPDATE dishes SET macro_embedding = ${vecStr}::vector WHERE id = ${dish.id}::uuid
    `;
    updated++;
  }

  console.log(`Done! Updated ${updated} embeddings for ${dishes.length} dishes.`);
  await prisma.$disconnect();
}

main().catch(console.error);
