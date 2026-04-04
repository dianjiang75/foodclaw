import "dotenv/config";

async function main() {
  const apiKey = process.env.YELP_API_KEY!;

  // Test with a known Yelp business ID (Joe's Pizza)
  const yelpId = "uc5qQMzs96rzjK27epDCug";

  console.log("Testing Yelp reviews API...");
  console.log(`Business ID: ${yelpId}`);
  console.log(`API key length: ${apiKey.length}\n`);

  const url = `https://api.yelp.com/v3/businesses/${yelpId}/reviews?limit=3&sort_by=yelp_sort`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  console.log(`Status: ${res.status} ${res.statusText}`);
  const data = await res.json();
  console.log(`Reviews count: ${data.reviews?.length ?? 0}`);

  if (data.reviews?.length > 0) {
    for (const r of data.reviews) {
      console.log(`\n  [${r.rating}/5] by ${r.user.name}:`);
      console.log(`  "${r.text.substring(0, 120)}..."`);
    }
  } else {
    console.log("Response:", JSON.stringify(data, null, 2));
  }

  // Also check that restaurant has yelpBusinessId set
  const { PrismaClient } = await import("../src/generated/prisma/client");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const withYelp = await prisma.restaurant.count({ where: { yelpBusinessId: { not: null } } });
  console.log(`\nRestaurants with yelpBusinessId: ${withYelp}/130`);

  // Check the aggregateReviews function reads yelpBusinessId
  const joes = await prisma.restaurant.findFirst({
    where: { name: { contains: "Joe's Pizza", mode: "insensitive" } },
    select: { id: true, name: true, googlePlaceId: true, yelpBusinessId: true },
  });
  console.log("\nJoe's Pizza DB record:", joes);

  await prisma.$disconnect();
}
main();
