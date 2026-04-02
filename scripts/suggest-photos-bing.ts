/**
 * Fetch dish photo suggestions from web image search (via local API proxy).
 * Picks the cleanest-looking photo from the top 10 results.
 * Prefers: food blogs, recipe sites. Avoids: stock sites, social media, AI.
 *
 * Usage: npx tsx scripts/suggest-photos-bing.ts
 * Requires: dev server running on localhost:3000
 */

import * as fs from "fs";
import * as path from "path";

const OUTPUT_FILE = path.join(__dirname, "approved-photos.json");
const PUBLIC_FILE = path.join(__dirname, "../public/admin/approved-photos.json");

interface Dish {
  name: string;
  description: string;
  restaurant: string;
  cuisine: string;
}

interface SearchResult {
  url: string;
  thumb: string;
  source: string;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Preferred sources — food blogs and recipe sites produce the cleanest overhead food photos
const PREFERRED_DOMAINS = [
  "seriouseats.com", "bonappetit.com", "foodandwine.com", "epicurious.com",
  "thekitchn.com", "cookinglight.com", "delish.com", "tastingtable.com",
  "simplyrecipes.com", "recipetineats.com", "therecipecritic.com",
  "thespruceeats.com", "saveur.com", "foodnetwork.com", "eatingthaifood.com",
  "indianhealthyrecipes.com", "whiskaffair.com", "myfoodstory.com",
  "justonecookbook.com", "wokandkin.com", "hot-thai-kitchen.com",
  "mission-food.com", "rasamalaysia.com", "maangchi.com", "koreanbapsang.com",
];

// Domains to avoid (messy photos, watermarks, user-generated)
const AVOID_DOMAINS = [
  "facebook.com", "instagram.com", "pinterest.com", "twitter.com",
  "tiktok.com", "youtube.com", "reddit.com", "quora.com",
  "amazon.com", "walmart.com", "ubereats.com", "doordash.com", "grubhub.com",
  "tripadvisor.com", "yelp.com",
  "wikimedia.org", "wikipedia.org",
  "unsplash.com", // User specifically doesn't want Unsplash
];

function scoreImage(result: SearchResult): number {
  let score = 0;
  const url = result.url.toLowerCase();
  const source = result.source.toLowerCase();

  // Boost preferred food blog domains
  for (const domain of PREFERRED_DOMAINS) {
    if (url.includes(domain) || source.includes(domain)) {
      score += 10;
      break;
    }
  }

  // Penalize bad domains
  for (const domain of AVOID_DOMAINS) {
    if (url.includes(domain) || source.includes(domain)) {
      score -= 100;
      break;
    }
  }

  // Prefer jpg/png over webp (usually higher quality source)
  if (url.includes(".jpg") || url.includes(".jpeg")) score += 2;
  if (url.includes(".png")) score += 1;

  // Prefer larger dimension indicators in URL
  if (url.match(/\d{3,4}x\d{3,4}/)) score += 1;

  return score;
}

async function searchForDish(dish: Dish): Promise<string | null> {
  try {
    const query = `${dish.name} ${dish.cuisine} ${dish.restaurant}`;
    const url = `http://localhost:3000/api/admin/image-search?q=${encodeURIComponent(query)}&limit=10`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();

    if (!data.images || data.images.length === 0) {
      // Fallback: simpler query
      const url2 = `http://localhost:3000/api/admin/image-search?q=${encodeURIComponent(dish.name + " " + dish.cuisine + " food")}&limit=10`;
      const res2 = await fetch(url2);
      if (!res2.ok) return null;
      const data2 = await res2.json();
      if (!data2.images?.length) return null;
      data.images = data2.images;
    }

    // Score and pick the best image
    const scored = data.images
      .map((img: SearchResult) => ({ ...img, score: scoreImage(img) }))
      .filter((img: SearchResult & { score: number }) => img.score > -50) // filter out bad domains
      .sort((a: { score: number }, b: { score: number }) => b.score - a.score);

    return scored[0]?.url || data.images[0]?.url || null;
  } catch {
    return null;
  }
}

async function main() {
  const dishesRaw = fs.readFileSync("/tmp/dishes-final.json", "utf8");
  const dishes: Dish[] = JSON.parse(dishesRaw);

  // Start fresh — replace ALL suggestions with web search results
  const results: Record<string, string> = {};

  console.log(`Searching web images for ${dishes.length} dishes (picking cleanest from top 10)...\n`);

  let found = 0;
  let failed = 0;

  for (let i = 0; i < dishes.length; i++) {
    const dish = dishes[i];
    process.stdout.write(`[${i + 1}/${dishes.length}] ${dish.name} → `);

    const url = await searchForDish(dish);

    if (url) {
      results[dish.name] = url;
      found++;
      // Show which domain was picked
      const domain = url.match(/\/\/([^/]+)\//)?.[1] || "";
      console.log(`✓ ${domain}`);
    } else {
      failed++;
      console.log("✗ no result");
    }

    // Save progress
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));

    await sleep(500);
  }

  // Copy to public folder
  fs.writeFileSync(PUBLIC_FILE, JSON.stringify(results, null, 2));

  console.log(`\nDone! ${found} found, ${failed} failed.`);
  console.log(`Saved to ${OUTPUT_FILE} and ${PUBLIC_FILE}`);
  console.log(`\nOpen http://localhost:3000/admin/photo-approval.html to review`);
}

main().catch(console.error);
