/**
 * Deep clean the DB — remove drinks, wines, sides, condiments, junk.
 * Also removes their photos and generated image files.
 *
 * Usage: npx tsx scripts/deep-clean-db.ts
 */
import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import IORedis from "ioredis";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ─── CLASSIFICATION RULES ───────────────────────────────

function isJunk(name: string, desc: string): boolean {
  const lower = (name + " " + desc).toLowerCase();
  return (
    /\b(gym|pool|spa|elevator|lobby|parking|wifi|check-in|checkout|luggage|hairdryer|shampoo|towel|grab rail|shower|bathtub|toilet|wc |concierge|doorman|bellhop|reception|housekeeping|wake-up|shuttle|airport|wheelchair|accessible|disability|handicap|step-free|ramp|braille)\b/i.test(lower) ||
    /\b(booking|reservation|phone|call us|contact|directions|close to|near subway|bus stop|train station)\b/i.test(lower) ||
    /\b(24-hour|360°|virtual tour|gallery|instagram|facebook|twitter|follow us|newsletter|our story|about us|careers)\b/i.test(lower) ||
    /^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)$/i.test(name.trim()) ||
    /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(name) ||
    /https?:\/\//.test(name) ||
    name.trim().length < 3 ||
    name.trim().length > 100
  );
}

function isDrink(name: string, _desc: string, category: string | null): boolean {
  // IMPORTANT: Only check NAME and CATEGORY, NOT description.
  // "Beer-battered fish tacos" is a dish, not a drink.
  // "Mussels in white wine" is a dish, not a drink.
  const lower = name.toLowerCase();
  const cat = (category || "").toLowerCase();

  // Wine codes
  if (/^\d{4}\s*\|/.test(name)) return true;

  // Category-based
  if (/wine|drink|beverage|cocktail|beer|spirit|bar /i.test(cat)) return true;

  // Name-based
  const drinkWords = [
    "wine", "beer", "cocktail", "margarita", "martini", "sangria", "mojito",
    "prosecco", "champagne", "whiskey", "bourbon", "vodka", "tequila", "sake",
    "soju", "merlot", "chardonnay", "cabernet", "pinot noir", "pinot grigio",
    "riesling", "sauvignon", "rosé", "malbec", "tempranillo", "syrah",
    "cider", "lager", "stout", "mezcal", "amaro", "grappa", "digestif",
    "aperitif", "añejo", "reposado", "blanco", "negroni", "daiquiri",
    "old fashioned", "manhattan cocktail", "cosmopolitan",
  ];
  if (drinkWords.some(w => lower.includes(w))) return true;

  // Exact match standalone drinks
  const standaloneDrinks = [
    "water", "ice water", "sparkling water", "still water", "tap water",
    "sparkling", "seltzer", "lemonade", "juice", "orange juice", "apple juice",
    "smoothie", "milkshake", "horchata", "lassi", "mango lassi",
    "coffee", "espresso", "latte", "cappuccino", "americano", "macchiato",
    "tea", "iced tea", "hot tea", "green tea", "matcha", "chai",
    "kombucha", "soda", "cola", "diet coke", "sprite", "ginger ale",
    "cold brew", "drip coffee", "vietnamese iced coffee",
    "frozen pool party", "sparkling cosmo",
  ];
  if (standaloneDrinks.some(d => name.trim().toLowerCase() === d)) return true;

  return false;
}

function isSideOrCondiment(name: string): boolean {
  const lower = name.trim().toLowerCase();

  // Standalone sides
  const sides = [
    "bread", "rice", "white rice", "brown rice", "steamed rice", "jasmine rice",
    "naan", "garlic naan", "roti", "tortilla", "pita", "baguette", "roll", "dinner roll",
    "biscuit", "corn bread", "french fries", "fries", "onion rings", "coleslaw",
    "mashed potatoes", "hush puppies", "side salad", "house salad", "mixed greens",
    "chips", "chips and salsa", "tortilla chips",
  ];
  if (sides.includes(lower)) return true;

  // Condiments
  const condiments = [
    "pickles", "kimchi", "edamame", "extra sauce", "dipping sauce", "ranch",
    "ketchup", "mayo", "mayonnaise", "hot sauce", "soy sauce", "sriracha",
    "wasabi", "ginger", "pickled ginger", "dried seaweed", "seaweed", "nori",
    "butter", "olive oil", "salt", "pepper", "chili flakes",
  ];
  if (condiments.some(c => lower === c || lower.startsWith(c + " ("))) return true;

  // Refills, extras, add-ons
  if (/\b(refill|extra |add-on|add on|upgrade|substitute|side of )\b/i.test(name)) return true;
  if (/kae-dama/i.test(name)) return true;
  if (/\(noodle refill\)/i.test(name)) return true;

  // Just a count of something: "2 Pieces", "4oz"
  if (/^\d+\s*(pieces?|pcs?|oz|ml)\s*$/i.test(lower)) return true;

  return false;
}

// ─── MAIN ───────────────────────────────────────────────

async function main() {
  const allDishes = await prisma.dish.findMany({
    select: { id: true, name: true, description: true, category: true },
  });

  console.log(`Auditing ${allDishes.length} dishes...\n`);

  const toRemove: { id: string; name: string; reason: string }[] = [];
  let keepCount = 0;

  for (const d of allDishes) {
    const desc = d.description || "";
    if (isJunk(d.name, desc)) {
      toRemove.push({ id: d.id, name: d.name, reason: "junk" });
    } else if (isDrink(d.name, desc, d.category)) {
      toRemove.push({ id: d.id, name: d.name, reason: "drink" });
    } else if (isSideOrCondiment(d.name)) {
      toRemove.push({ id: d.id, name: d.name, reason: "side/condiment" });
    } else {
      keepCount++;
    }
  }

  const junkCount = toRemove.filter(d => d.reason === "junk").length;
  const drinkCount = toRemove.filter(d => d.reason === "drink").length;
  const sideCount = toRemove.filter(d => d.reason === "side/condiment").length;

  console.log(`=== RESULTS ===`);
  console.log(`Keep (real dishes): ${keepCount}`);
  console.log(`Remove — junk: ${junkCount}`);
  console.log(`Remove — drinks: ${drinkCount}`);
  console.log(`Remove — sides/condiments: ${sideCount}`);
  console.log(`TOTAL TO REMOVE: ${toRemove.length}\n`);

  // Show samples
  console.log("--- Sample drinks being removed ---");
  toRemove.filter(d => d.reason === "drink").slice(0, 15).forEach(d => console.log(`  ${d.name}`));
  console.log("\n--- Sample sides/condiments ---");
  toRemove.filter(d => d.reason === "side/condiment").slice(0, 10).forEach(d => console.log(`  ${d.name}`));
  console.log("\n--- Sample junk ---");
  toRemove.filter(d => d.reason === "junk").slice(0, 10).forEach(d => console.log(`  ${d.name}`));

  // DELETE from DB
  console.log(`\nDeleting ${toRemove.length} items from DB...`);
  const ids = toRemove.map(d => d.id);

  // Delete related records first
  await prisma.dishPhoto.deleteMany({ where: { dishId: { in: ids } } });
  await prisma.reviewSummary.deleteMany({ where: { dishId: { in: ids } } });
  await prisma.communityFeedback.deleteMany({ where: { dishId: { in: ids } } });
  await prisma.userFavorite.deleteMany({ where: { dishId: { in: ids } } });
  const deleted = await prisma.dish.deleteMany({ where: { id: { in: ids } } });
  console.log(`Deleted ${deleted.count} dishes from DB`);

  // Clean up generated photos JSON
  const genFile = path.join(__dirname, "generated-photos.json");
  if (fs.existsSync(genFile)) {
    const gen = JSON.parse(fs.readFileSync(genFile, "utf8")) as Record<string, string>;
    const removedNames = new Set(toRemove.map(d => d.name));
    let cleaned = 0;
    for (const name of Object.keys(gen)) {
      if (removedNames.has(name)) {
        // Delete the image file too
        const imgPath = path.join(__dirname, "..", "public", gen[name]);
        if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
        delete gen[name];
        cleaned++;
      }
    }
    fs.writeFileSync(genFile, JSON.stringify(gen, null, 2));
    fs.copyFileSync(genFile, path.join(__dirname, "../public/admin/generated-photos.json"));
    console.log(`Cleaned ${cleaned} entries from generated-photos.json`);
  }

  // Also clean approved photos
  const approvedFile = path.join(__dirname, "approved-photos.json");
  if (fs.existsSync(approvedFile)) {
    const approved = JSON.parse(fs.readFileSync(approvedFile, "utf8")) as Record<string, string>;
    const removedNames = new Set(toRemove.map(d => d.name));
    let cleaned = 0;
    for (const name of Object.keys(approved)) {
      if (removedNames.has(name)) {
        delete approved[name];
        cleaned++;
      }
    }
    fs.writeFileSync(approvedFile, JSON.stringify(approved, null, 2));
    fs.copyFileSync(approvedFile, path.join(__dirname, "../public/admin/approved-photos.json"));
    console.log(`Cleaned ${cleaned} entries from approved-photos.json`);
  }

  // Flush Redis cache
  try {
    const redis = new IORedis(process.env.REDIS_URL || "redis://localhost:6379");
    await redis.flushall();
    await redis.quit();
    console.log("Redis cache flushed");
  } catch {
    console.log("Warning: could not flush Redis");
  }

  // Also deactivate non-restaurant businesses
  const hotels = await prisma.restaurant.findMany({
    where: {
      OR: [
        { name: { contains: "Hotel", mode: "insensitive" } },
        { name: { contains: "Motel", mode: "insensitive" } },
        { name: { contains: "Hostel", mode: "insensitive" } },
      ],
      isActive: true,
    },
  });
  for (const h of hotels) {
    await prisma.restaurant.update({ where: { id: h.id }, data: { isActive: false } });
    console.log(`Deactivated non-restaurant: ${h.name}`);
  }

  console.log(`\nDone! ${keepCount} real dishes remain in DB.`);
  await prisma.$disconnect();
}

main().catch(console.error);
