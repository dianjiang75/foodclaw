/**
 * AGGRESSIVE deep clean — if it's not OBVIOUSLY food, it gets removed.
 * The opposite of the previous approach: instead of listing what's bad,
 * we list what GOOD dishes look like and reject everything else.
 */
import * as fs from "fs";
import * as path from "path";

const GEN_FILE = path.join(__dirname, "generated-photos.json");

// A real dish name should match at least one of these patterns:
// 1. Contains a known food word (protein, grain, vegetable, preparation method, cuisine term)
// 2. Is a known dish name pattern (proper noun + food context)
// 3. Has a reasonable length (5-80 chars) and doesn't contain junk signals

const FOOD_WORDS = new Set([
  // Proteins
  "chicken", "beef", "pork", "lamb", "steak", "fish", "salmon", "tuna", "shrimp", "prawn",
  "lobster", "crab", "squid", "octopus", "clam", "mussel", "oyster", "scallop", "duck",
  "turkey", "veal", "brisket", "rib", "ribs", "wing", "wings", "thigh", "breast",
  "sausage", "bacon", "ham", "chorizo", "prosciutto", "pancetta", "salami",
  "tofu", "tempeh", "seitan", "egg", "eggs", "omelette", "omelet",
  // Grains/carbs
  "rice", "noodle", "noodles", "pasta", "spaghetti", "penne", "rigatoni", "linguine",
  "fettuccine", "ramen", "udon", "soba", "pho", "vermicelli", "couscous", "quinoa",
  "bread", "naan", "roti", "tortilla", "pita", "baguette", "focaccia", "ciabatta",
  "pizza", "pie", "tart", "cake", "pastry", "croissant", "muffin", "scone",
  "dumpling", "dumplings", "gyoza", "wonton", "bao", "bun", "roll", "spring roll",
  // Vegetables/fruits
  "salad", "kale", "spinach", "broccoli", "cauliflower", "eggplant", "zucchini",
  "mushroom", "mushrooms", "potato", "potatoes", "sweet potato", "corn", "bean",
  "avocado", "tomato", "cucumber", "pepper", "onion", "garlic", "mango",
  // Preparations
  "grilled", "fried", "roasted", "baked", "steamed", "braised", "smoked", "seared",
  "poached", "sauteed", "sautéed", "stir-fried", "pan-fried", "deep-fried",
  "crispy", "crunchy", "tender", "slow-cooked", "marinated", "glazed", "stuffed",
  // Dish types
  "soup", "stew", "curry", "chowder", "bisque", "gumbo", "chili",
  "sandwich", "burger", "wrap", "taco", "tacos", "burrito", "quesadilla", "enchilada",
  "bowl", "plate", "platter", "combo", "set", "special",
  "appetizer", "entree", "entrée", "dessert", "starter",
  "sushi", "sashimi", "nigiri", "maki", "temaki", "chirashi", "omakase",
  "dim sum", "tapas", "mezze", "antipasto", "antipasti",
  "fries", "chips", "tots", "rings", "fritters", "croquette",
  "casserole", "gratin", "risotto", "paella", "biryani", "pilaf",
  "pancake", "pancakes", "waffle", "waffles", "crepe", "crepes", "french toast",
  // Cuisine-specific dish words
  "tikka", "masala", "tandoori", "vindaloo", "korma", "biryani", "dosa", "samosa",
  "pad thai", "tom yum", "som tum", "satay", "rendang", "laksa", "larb",
  "bibimbap", "bulgogi", "kimchi", "japchae", "tteokbokki", "bossam", "jjigae",
  "poke", "katsu", "teriyaki", "yakitori", "tempura", "tonkatsu", "karaage",
  "mole", "carnitas", "al pastor", "birria", "pozole", "tamale", "ceviche",
  "hummus", "falafel", "shawarma", "kebab", "pide", "lahmacun", "borek",
  "bolognese", "carbonara", "alfredo", "pesto", "marinara", "arrabbiata",
  "bruschetta", "carpaccio", "osso buco", "saltimbocca", "piccata",
  "baklava", "tiramisu", "crème brûlée", "gelato", "sorbet", "mousse",
  "cheesecake", "brownie", "cookie", "macaron", "profiterole",
  // Sauces/preparations that indicate a dish
  "with", "topped", "served", "accompanied", "over", "stuffed with",
]);

const JUNK_SIGNALS = [
  // Hotel/business
  /\b(gym|pool|spa|elevator|lobby|parking|wifi|check-in|checkout|luggage|wheelchair|accessible|basin|shower|bathtub|toilet|wc |grab rail|step-free|adjoining|suite|bedroom|room|concierge|doorman|bellhop|reception|housekeeping|wake-up|shuttle|airport)\b/i,
  // Business info
  /\b(booking|reservation|phone|call us|contact|press|directions|close to|near |subway|bus stop|announced|announcement|festival|music|event|closed|opening|hours|weekday|weekend|3pm|6pm|10pm|daily|am |pm )\b/i,
  // Marketing/social
  /\b(instagram|facebook|twitter|follow us|newsletter|our story|about us|careers|just announced|coming soon)\b/i,
  // Day names standalone
  /^(sunday|monday|tuesday|wednesday|thursday|friday|saturday|brunch|lunch|dinner|breakfast|happy hour)$/i,
  // Time patterns
  /\d{1,2}(am|pm)\b/i,
  /\d{1,2}:\d{2}/,
  // Phone numbers
  /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/,
  // URLs
  /https?:\/\//,
  // Dietary legend labels
  /^[vV]:?\s*(vegetarian|vegan)/,
  /^(vg|gf|df|v):\s/i,
  // "to share" standalone
  /^to share$/i,
  // Wine/spirit patterns
  /\d{4}\s*$/,  // ends in year
  /\b(vineyard|winery|estate|domaine|château|bodega|weingut|cantina)\b/i,
  /\b(grüner|veltliner|riesling|chardonnay|sauvignon|cabernet|merlot|pinot|syrah|malbec|nebbiolo|sangiovese|barbera|aglianico|primitivo|vermentino|garganega)\b/i,
  /\b(brut|cuvée|rosé|blanc|rouge|sec|spumante|cremant|frizzante|reserva|crianza|riserva|classico)\b/i,
  /\b(bourbon|scotch|whisky|whiskey|cognac|brandy|grappa|calvados|mezcal|absinthe)\b/i,
  /\b(grand marnier|cointreau|kahlua|baileys|sambuca|limoncello|frangelico|chambord|amaretto)\b/i,
  /\b(kavalan|blanton|mitcher|starward|lusatu|ardbeg|laphroaig|macallan|glenfiddich|glenlivet|balvenie|lagavulin|talisker|hibiki|johnnie walker|del maguey|montelobos)\b/i,
  /\b(fino|oloroso|amontillado|pedro ximenez|manzanilla|palo cortado)\b/i,
  /\b(pilsner|lager|pale ale|ipa|stout|porter|hefeweizen|witbier|saison|gose|lambic|dubbel|tripel)\b/i,
  // Standalone condiments/vinegars
  /^(vinegar|oil|salt|pepper|sugar|honey|mustard|ketchup|mayo|mayonnaise|ranch|sriracha|tabasco)\s*$/i,
  /vinegar$/i,
  // Oz portions (sauces)
  /\d+\s*oz\b/i,
];

function isRealDish(name: string): boolean {
  const lower = name.toLowerCase().trim();

  // Too short or too long
  if (lower.length < 4 || lower.length > 80) return false;

  // Check junk signals first — any match = NOT a dish
  for (const pattern of JUNK_SIGNALS) {
    if (pattern.test(name)) return false;
  }

  // Check if ANY food word appears in the name
  const words = lower.split(/[\s,\-()\/]+/);
  for (const word of words) {
    if (FOOD_WORDS.has(word)) return true;
  }

  // Also check multi-word food terms
  for (const foodWord of FOOD_WORDS) {
    if (foodWord.includes(" ") && lower.includes(foodWord)) return true;
  }

  // If no food word found, it MIGHT still be a valid dish with a proper name
  // (e.g., "Margherita", "Inferno", "Diavola" — pizza names)
  // Allow it if: reasonable length, no junk signals, starts with capital letter
  if (name.length >= 4 && name.length <= 40 && /^[A-Z]/.test(name) && !/\d/.test(name)) {
    return true; // Give benefit of doubt to short capitalized names
  }

  return false;
}

// Run
const generated: Record<string, string> = JSON.parse(fs.readFileSync(GEN_FILE, "utf8"));
const allNames = Object.keys(generated);
const toRemove: string[] = [];
const toKeep: string[] = [];

for (const name of allNames) {
  if (isRealDish(name)) {
    toKeep.push(name);
  } else {
    toRemove.push(name);
  }
}

console.log(`Total: ${allNames.length}`);
console.log(`Keep: ${toKeep.length}`);
console.log(`Remove: ${toRemove.length}`);
console.log(`\n--- Removing ---`);
toRemove.forEach(n => console.log(`  ${n}`));

// Clean
const removeSet = new Set(toRemove);
let cleaned = 0;
for (const name of Object.keys(generated)) {
  if (removeSet.has(name)) {
    const imgPath = path.join(__dirname, "..", "public", generated[name]);
    try { fs.unlinkSync(imgPath); } catch {}
    delete generated[name];
    cleaned++;
  }
}

fs.writeFileSync(GEN_FILE, JSON.stringify(generated, null, 2));
fs.copyFileSync(GEN_FILE, path.join(__dirname, "../public/admin/generated-photos.json"));

// Clean approved too
const approvedFile = path.join(__dirname, "approved-photos.json");
if (fs.existsSync(approvedFile)) {
  const ap = JSON.parse(fs.readFileSync(approvedFile, "utf8")) as Record<string, string>;
  for (const n of toRemove) delete ap[n];
  fs.writeFileSync(approvedFile, JSON.stringify(ap, null, 2));
  fs.copyFileSync(approvedFile, path.join(__dirname, "../public/admin/approved-photos.json"));
}

console.log(`\nCleaned ${cleaned} entries. ${Object.keys(generated).length} dishes remain.`);
