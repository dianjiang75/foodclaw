import "dotenv/config";

async function main() {
  const { PrismaClient } = await import("../src/generated/prisma/client");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const total = await prisma.restaurant.count({ where: { isActive: true } });
  const withYelp = await prisma.restaurant.count({ where: { isActive: true, yelpBusinessId: { not: null } } });

  console.log(`Total active restaurants: ${total}`);
  console.log(`With yelpBusinessId:      ${withYelp}`);
  console.log(`Missing yelpBusinessId:   ${total - withYelp}`);

  const samples = await prisma.restaurant.findMany({
    where: { yelpBusinessId: { not: null } },
    select: { name: true, yelpBusinessId: true },
    take: 5,
  });
  if (samples.length > 0) {
    console.log(`\nSamples with Yelp ID:`);
    for (const s of samples) console.log(`  ${s.name} → ${s.yelpBusinessId}`);
  }

  await prisma.$disconnect();
}
main();
