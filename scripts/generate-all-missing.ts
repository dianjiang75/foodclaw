/**
 * Generate AI images for ALL dishes in DB that don't have one yet.
 * Skips drinks/wines. Finds reference from Bing, generates via NanoBanana 2.
 *
 * Usage: npx tsx scripts/generate-all-missing.ts
 * Requires: dev server on localhost:3000 (for Bing image search proxy)
 */
import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { generateDishImage } from "../src/lib/agents/image-generator";

const GENERATED_FILE = path.join(__dirname, "generated-photos.json");
const DISHES_FILE = "/tmp/dishes-needing-photos.json";

interface Dish {
  id: string;
  name: string;
  description: string | null;
  cuisine: string;
  restaurant: string;
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function findReference(dish: Dish): Promise<string | null> {
  try {
    const q = encodeURIComponent(`${dish.name} ${dish.cuisine} food dish`);
    const res = await fetch(`http://localhost:3000/api/admin/image-search?q=${q}&limit=5`);
    if (!res.ok) return null;
    const data = await res.json();
    // Pick first non-stock-photo result
    return data.images?.[0]?.url || null;
  } catch {
    return null;
  }
}

async function main() {
  if (!fs.existsSync(DISHES_FILE)) {
    console.error("Run the dish extraction first (see generate-all-missing.ts header)");
    process.exit(1);
  }

  const dishes: Dish[] = JSON.parse(fs.readFileSync(DISHES_FILE, "utf8"));
  let generated: Record<string, string> = {};
  if (fs.existsSync(GENERATED_FILE)) {
    generated = JSON.parse(fs.readFileSync(GENERATED_FILE, "utf8"));
  }

  // Skip already generated
  const pending = dishes.filter(d => !generated[d.name]);
  console.log(`${pending.length} dishes to process (${Object.keys(generated).length} already done)\n`);

  let ok = 0, noRef = 0, fail = 0;

  for (let i = 0; i < pending.length; i++) {
    const dish = pending[i];
    const id = dish.id.substring(0, 8); // Use first 8 chars of UUID for filename
    process.stdout.write(`[${i + 1}/${pending.length}] ${dish.name} → `);

    // Step 1: Find reference image
    const ref = await findReference(dish);
    if (!ref) {
      noRef++;
      console.log("NO REF");
      await sleep(500);
      continue;
    }

    // Step 2: Generate AI image
    try {
      const slug = dish.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
      const { localPath } = await generateDishImage(
        ref, dish.name, dish.cuisine, dish.description || undefined, slug + "-v2"
      );
      generated[dish.name] = localPath;
      ok++;
      console.log("OK");

      // Save progress every 10 images
      if (ok % 10 === 0) {
        fs.writeFileSync(GENERATED_FILE, JSON.stringify(generated, null, 2));
      }
    } catch (e) {
      fail++;
      console.log("FAIL:", (e as Error).message?.substring(0, 80));
    }

    // Rate limit: 2s between requests
    await sleep(2000);
  }

  // Final save
  fs.writeFileSync(GENERATED_FILE, JSON.stringify(generated, null, 2));
  fs.copyFileSync(GENERATED_FILE, path.join(__dirname, "../public/admin/generated-photos.json"));

  console.log(`\nDone! ${ok} generated, ${noRef} no reference found, ${fail} failed.`);
  console.log(`Total in generated-photos.json: ${Object.keys(generated).length}`);
  console.log(`\nNext: run 'npx tsx scripts/apply-generated-photos.ts' to push to DB`);
}

main().catch(console.error);
