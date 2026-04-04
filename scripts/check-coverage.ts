import "dotenv/config";

async function main() {
  const { PrismaClient } = await import("../src/generated/prisma/client");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const totalDishes = await prisma.dish.count();
  const dishesWithReviews = await prisma.dish.count({
    where: { reviewSummary: { isNot: null } },
  });
  const totalReviews = await prisma.reviewSummary.count();

  console.log(`\nDishes:          ${totalDishes}`);
  console.log(`With reviews:    ${dishesWithReviews}/${totalDishes} (${(dishesWithReviews/totalDishes*100).toFixed(1)}%)`);
  console.log(`Review summaries: ${totalReviews}`);

  // Restaurants with reviews vs without
  const restaurantsWithReviews = await prisma.$queryRaw<{count: number}[]>`
    SELECT COUNT(DISTINCT r.id)::int as count
    FROM restaurants r
    JOIN dishes d ON d.restaurant_id = r.id
    JOIN review_summaries rs ON rs.dish_id = d.id
  `;
  const totalActiveRestaurants = await prisma.restaurant.count({ where: { isActive: true } });
  console.log(`Restaurants with dish reviews: ${restaurantsWithReviews[0]?.count}/${totalActiveRestaurants}`);

  await prisma.$disconnect();
}
main();
