/**
 * Use Claude to classify ALL items in generated-photos.json.
 * Removes wines, spirits, sauces, sides, junk — keeps only real dishes.
 *
 * Usage: npx tsx scripts/claude-clean-photos.ts
 */
import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import Anthropic from "@anthropic-ai/sdk";

const GEN_FILE = path.join(__dirname, "generated-photos.json");
const BATCH_SIZE = 100;

async function main() {
  const client = new Anthropic();
  const generated: Record<string, string> = JSON.parse(fs.readFileSync(GEN_FILE, "utf8"));
  const allNames = Object.keys(generated);
  console.log(`Classifying ${allNames.length} items with Claude Haiku...\n`);

  const toRemove: string[] = [];
  const toKeep: string[] = [];

  for (let i = 0; i < allNames.length; i += BATCH_SIZE) {
    const batch = allNames.slice(i, i + BATCH_SIZE);
    process.stdout.write(`[${i + 1}-${Math.min(i + BATCH_SIZE, allNames.length)}/${allNames.length}] `);

    const prompt = `Classify each item as EXACTLY ONE of: "dish", "drink", "side", "junk".

Rules:
- "dish" = a real standalone restaurant dish (entrée, appetizer, dessert, soup, main course, dumpling, taco, curry, etc.)
- "drink" = ANY beverage: wine (even fancy names with vineyard/year/region), beer, cocktail, spirit, liqueur, coffee, tea, juice, water, soda, smoothie, horchata, lassi. If it has a vintage year at the end (e.g. "2021", "2022"), it's almost certainly wine.
- "side" = condiment, sauce, dressing, dip, bread, plain rice, noodle refill, individual pickled items, small sides sold separately (e.g. "Ranch 2oz", "Pickled Radish Cubes", "Extra Naan")
- "junk" = not food: hotel amenity, business info, navigation, phone number, misspelling, or unidentifiable item

BE STRICT. When in doubt between "dish" and "drink", if it sounds like alcohol or a beverage, mark it "drink". When in doubt between "dish" and "side", if it's something you'd only order as an add-on, mark it "side".

Items: ${JSON.stringify(batch)}

Return ONLY JSON array: [{"name":"...","type":"dish"|"drink"|"side"|"junk"}]`;

    try {
      const response = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      });

      const text = response.content.find(b => b.type === "text")?.text || "";
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) { console.log("NO JSON"); toKeep.push(...batch); continue; }

      const classifications: { name: string; type: string }[] = JSON.parse(jsonMatch[0]);

      let dishes = 0, drinks = 0, sides = 0, junk = 0;
      for (const c of classifications) {
        if (c.type === "dish") { toKeep.push(c.name); dishes++; }
        else { toRemove.push(c.name); if (c.type === "drink") drinks++; else if (c.type === "side") sides++; else junk++; }
      }
      console.log(`${dishes} dishes, ${drinks} drinks, ${sides} sides, ${junk} junk`);
    } catch (e) {
      console.log("ERROR:", (e as Error).message?.substring(0, 80));
      toKeep.push(...batch);
    }

    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n=== RESULTS ===`);
  console.log(`Keep (dishes): ${toKeep.length}`);
  console.log(`Remove: ${toRemove.length}`);
  console.log(`\n--- Removing (sample) ---`);
  toRemove.slice(0, 40).forEach(n => console.log(`  ${n}`));
  if (toRemove.length > 40) console.log(`  ... and ${toRemove.length - 40} more`);

  // Clean the JSON + delete image files
  const removeSet = new Set(toRemove);
  let cleaned = 0;
  for (const name of Object.keys(generated)) {
    if (removeSet.has(name)) {
      const imgPath = path.join(__dirname, "..", "public", generated[name]);
      if (fs.existsSync(imgPath)) { fs.unlinkSync(imgPath); }
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
    for (const name of toRemove) delete approved[name];
    fs.writeFileSync(approvedFile, JSON.stringify(approved, null, 2));
    fs.copyFileSync(approvedFile, path.join(__dirname, "../public/admin/approved-photos.json"));
  }

  console.log(`\nCleaned ${cleaned} entries + image files. ${Object.keys(generated).length} dishes remain.`);
}

main().catch(console.error);
