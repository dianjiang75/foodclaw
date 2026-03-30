/**
 * CLI script to summarize reviews for a dish.
 * Usage: npx tsx -r tsconfig-paths/register scripts/summarize-reviews.ts <restaurant_name> <dish_name>
 */
import "dotenv/config";

async function main() {
  const [restaurantName, dishName] = process.argv.slice(2);

  if (!restaurantName || !dishName) {
    console.error(
      'Usage: npx tsx -r tsconfig-paths/register scripts/summarize-reviews.ts "Restaurant Name" "Dish Name"'
    );
    process.exit(1);
  }

  const { summarizeDishReviews } = await import(
    "../src/lib/agents/review-aggregator"
  );

  // For CLI demo, use sample reviews
  const sampleReviews = [
    { text: `The ${dishName} was absolutely delicious! Great portion size.`, rating: 5, author: "Demo User 1", date: "recently", source: "google" as const },
    { text: `Ordered the ${dishName}, it was good but slightly overpriced.`, rating: 3, author: "Demo User 2", date: "last week", source: "yelp" as const },
    { text: `Best ${dishName} in town. Fresh ingredients and great flavor.`, rating: 5, author: "Demo User 3", date: "a month ago", source: "google" as const },
  ];

  console.log(`\nSummarizing reviews for "${dishName}" at "${restaurantName}"\n`);

  try {
    const result = await summarizeDishReviews(dishName, restaurantName, sampleReviews);
    console.log(`Rating:     ${result.dish_rating}/5`);
    console.log(`Summary:    ${result.summary}`);
    console.log(`Praises:    ${result.common_praises.join(", ") || "None"}`);
    console.log(`Complaints: ${result.common_complaints.join(", ") || "None"}`);
    console.log(`Warnings:   ${result.dietary_warnings.join(", ") || "None"}`);
    console.log(`Portions:   ${result.portion_perception}`);
  } catch (err) {
    console.error("Error:", (err as Error).message);
    process.exit(1);
  }

  process.exit(0);
}

main();
