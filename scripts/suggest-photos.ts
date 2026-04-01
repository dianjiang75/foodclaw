/**
 * Auto-suggest dish photos from Unsplash.
 * Searches for each dish and saves the best match to approved-photos.json.
 *
 * Usage: npx tsx scripts/suggest-photos.ts
 */

import * as fs from "fs";
import * as path from "path";

const DISHES_FILE = path.join(__dirname, "..//tmp/dishes-final.json");
const OUTPUT_FILE = path.join(__dirname, "approved-photos.json");

interface Dish {
  name: string;
  description: string;
  restaurant: string;
  cuisine: string;
}

// Build a smart search query from dish name + description
function buildQuery(dish: Dish): string {
  // Use dish name + first few keywords from description + "food dish"
  const descWords = dish.description
    .split(/[,.]/)
    [0] // first clause
    .replace(/with|and|in|on|the|a|an|of/gi, "")
    .trim();

  return `${dish.name} ${descWords} food dish`.substring(0, 80);
}

async function searchUnsplash(query: string): Promise<{ url: string; description: string } | null> {
  try {
    const res = await fetch(
      `https://unsplash.com/napi/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
      {
        headers: {
          "Accept": "application/json",
          "User-Agent": "FoodClaw/1.0",
        },
      }
    );

    if (!res.ok) {
      console.error(`  HTTP ${res.status} for query: ${query}`);
      return null;
    }

    const data = await res.json();
    const photo = data.results?.[0];
    if (!photo) return null;

    // Use the raw URL with our own size params for best quality
    const url = `${photo.urls.raw}&w=800&h=600&fit=crop&crop=entropy`;
    return { url, description: photo.alt_description || "" };
  } catch (err) {
    console.error(`  Error: ${(err as Error).message}`);
    return null;
  }
}

// Rate limit: ~50 req/hr on Unsplash napi, so we go slow
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  // Load dishes
  const dishesRaw = fs.readFileSync("/tmp/dishes-final.json", "utf8");
  const dishes: Dish[] = JSON.parse(dishesRaw);

  // Load existing approved photos if any
  let existing: Record<string, string> = {};
  if (fs.existsSync(OUTPUT_FILE)) {
    existing = JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf8"));
  }

  console.log(`Found ${dishes.length} dishes, ${Object.keys(existing).length} already have photos`);
  console.log("Searching Unsplash for remaining dishes...\n");

  let count = 0;
  let skipped = 0;

  for (const dish of dishes) {
    // Skip if already has an approved photo
    if (existing[dish.name]) {
      skipped++;
      continue;
    }

    count++;
    const query = buildQuery(dish);
    process.stdout.write(`[${count}/${dishes.length - skipped}] ${dish.name} → `);

    const result = await searchUnsplash(query);

    if (result) {
      existing[dish.name] = result.url;
      console.log(`✓ ${result.description?.substring(0, 60) || "found"}`);
    } else {
      // Try simpler query with just the dish name
      const simpleResult = await searchUnsplash(dish.name + " food");
      if (simpleResult) {
        existing[dish.name] = simpleResult.url;
        console.log(`✓ (simple) ${simpleResult.description?.substring(0, 60) || "found"}`);
      } else {
        console.log("✗ no result");
      }
      await sleep(1000);
    }

    // Save progress after each dish
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(existing, null, 2));

    // Rate limit: ~1.5 seconds between requests
    await sleep(1500);
  }

  console.log(`\nDone! ${Object.keys(existing).length} dishes have photos.`);
  console.log(`Saved to ${OUTPUT_FILE}`);
}

main().catch(console.error);
