/**
 * Use Gemini Flash to classify ALL items in generated-photos.json.
 * Removes anything that's NOT a standalone dish (wines, spirits, sauces, sides, etc.)
 *
 * Usage: npx tsx scripts/llm-clean-photos.ts
 */
import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEN_FILE = path.join(__dirname, "generated-photos.json");
const BATCH_SIZE = 80; // items per LLM call

async function main() {
  const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = gemini.getGenerativeModel({ model: "gemini-2.5-flash" });

  const generated: Record<string, string> = JSON.parse(fs.readFileSync(GEN_FILE, "utf8"));
  const allNames = Object.keys(generated);
  console.log(`Classifying ${allNames.length} items with Gemini Flash...\n`);

  const toRemove: string[] = [];
  const toKeep: string[] = [];

  for (let i = 0; i < allNames.length; i += BATCH_SIZE) {
    const batch = allNames.slice(i, i + BATCH_SIZE);
    process.stdout.write(`[${i + 1}-${Math.min(i + BATCH_SIZE, allNames.length)}/${allNames.length}] `);

    const prompt = `You are a food menu auditor. Classify each item as EXACTLY ONE of:
- "dish" — a real, standalone food dish you'd order at a restaurant (entrée, appetizer, dessert, soup, salad, sandwich, etc.)
- "drink" — any beverage: wine, beer, cocktail, spirit, coffee, tea, juice, water, soda, smoothie, lassi, horchata
- "side" — a small side dish, condiment, sauce, dressing, dip, bread, rice, noodle refill, pickled item sold separately
- "junk" — not food at all: hotel amenities, business info, navigation, phone numbers, weird/misspelled non-food items

IMPORTANT: Wines are ALWAYS "drink" even if they have a fancy name with vineyard, year, region.
Sauces/dressings sold in oz portions (e.g. "Ranch 2oz") are ALWAYS "side".
Individual pickled items (e.g. "Pickled Radish Cubes") are "side" unless they're a full dish.

Items:
${JSON.stringify(batch)}

Return ONLY a JSON array of objects: [{"name":"...","type":"dish"|"drink"|"side"|"junk"}]`;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      // Extract JSON from response
      const jsonMatch = text?.match(/\[[\s\S]*\]/);
      if (!jsonMatch) { console.log("NO JSON"); continue; }

      const classifications: { name: string; type: string }[] = JSON.parse(jsonMatch[0]);

      let dishes = 0, drinks = 0, sides = 0, junk = 0;
      for (const c of classifications) {
        if (c.type === "dish") { toKeep.push(c.name); dishes++; }
        else { toRemove.push(c.name); if (c.type === "drink") drinks++; else if (c.type === "side") sides++; else junk++; }
      }
      console.log(`${dishes} dishes, ${drinks} drinks, ${sides} sides, ${junk} junk`);
    } catch (e) {
      console.log("ERROR:", (e as Error).message?.substring(0, 80));
      // On error, keep all items in batch (fail-open)
      toKeep.push(...batch);
    }

    // Rate limit
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`\n=== RESULTS ===`);
  console.log(`Keep (dishes): ${toKeep.length}`);
  console.log(`Remove: ${toRemove.length}`);

  // Show what's being removed
  console.log(`\n--- Removing ---`);
  toRemove.slice(0, 30).forEach(n => console.log(`  ${n}`));
  if (toRemove.length > 30) console.log(`  ... and ${toRemove.length - 30} more`);

  // Clean the JSON
  const removeSet = new Set(toRemove);
  let cleaned = 0;
  for (const name of Object.keys(generated)) {
    if (removeSet.has(name)) {
      // Delete the image file
      const imgPath = path.join(__dirname, "..", "public", generated[name]);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
      delete generated[name];
      cleaned++;
    }
  }

  fs.writeFileSync(GEN_FILE, JSON.stringify(generated, null, 2));
  fs.copyFileSync(GEN_FILE, path.join(__dirname, "../public/admin/generated-photos.json"));

  // Also clean approved-photos.json
  const approvedFile = path.join(__dirname, "approved-photos.json");
  if (fs.existsSync(approvedFile)) {
    const approved = JSON.parse(fs.readFileSync(approvedFile, "utf8")) as Record<string, string>;
    for (const name of toRemove) { delete approved[name]; }
    fs.writeFileSync(approvedFile, JSON.stringify(approved, null, 2));
    fs.copyFileSync(approvedFile, path.join(__dirname, "../public/admin/approved-photos.json"));
  }

  console.log(`\nCleaned ${cleaned} entries. ${Object.keys(generated).length} dishes remain.`);
}

main().catch(console.error);
