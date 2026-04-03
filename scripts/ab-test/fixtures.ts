/**
 * A/B Test Fixtures — realistic dish data and review sets
 * for comparing Claude Sonnet vs DeepSeek V4 vs Qwen 3.
 */

export interface TestDish {
  name: string;
  description: string;
  category: string;
  /** Ground truth dietary flags — null = genuinely ambiguous */
  expected_flags: {
    vegan: boolean | null;
    vegetarian: boolean | null;
    gluten_free: boolean | null;
    dairy_free: boolean | null;
    nut_free: boolean | null;
    halal: boolean | null;
    kosher: boolean | null;
  };
  /** Which flags are safety-critical (false positive = allergen danger) */
  critical_flags: string[];
  notes: string;
}

export interface TestReviewSet {
  dish_name: string;
  restaurant_name: string;
  reviews: { text: string; rating: number; source: "google" | "yelp" }[];
  /** Expected themes the summary should capture */
  expected_themes: string[];
}

// ─── 50 DISHES FOR DIETARY FLAG TESTING ────────────────────
// Mix of easy, ambiguous, and trap dishes
export const TEST_DISHES: TestDish[] = [
  // === CLEARLY SAFE ===
  { name: "Steamed Broccoli with Lemon", description: "Fresh broccoli florets steamed and finished with lemon juice and sea salt", category: "Sides", expected_flags: { vegan: true, vegetarian: true, gluten_free: true, dairy_free: true, nut_free: true, halal: true, kosher: true }, critical_flags: [], notes: "Simple plant dish — all flags should be true" },
  { name: "Grilled Chicken Breast", description: "Seasoned chicken breast grilled over charcoal, served with steamed rice", category: "Entrees", expected_flags: { vegan: false, vegetarian: false, gluten_free: true, dairy_free: true, nut_free: true, halal: null, kosher: null }, critical_flags: ["nut_free", "gluten_free"], notes: "Halal/kosher depends on preparation — should be null" },
  { name: "Caesar Salad", description: "Romaine lettuce with Caesar dressing, croutons, and shaved parmesan", category: "Salads", expected_flags: { vegan: false, vegetarian: false, gluten_free: false, dairy_free: false, nut_free: true, halal: null, kosher: null }, critical_flags: ["nut_free"], notes: "TRAP: Caesar dressing has anchovies — NOT vegetarian. Croutons = not GF" },
  { name: "Margherita Pizza", description: "San Marzano tomato sauce, fresh mozzarella, basil on hand-tossed dough", category: "Pizza", expected_flags: { vegan: false, vegetarian: true, gluten_free: false, dairy_free: false, nut_free: true, halal: true, kosher: true }, critical_flags: ["nut_free", "gluten_free"], notes: "Classic vegetarian, contains gluten and dairy" },
  { name: "French Fries", description: "Hand-cut russet potatoes, double fried until golden", category: "Sides", expected_flags: { vegan: true, vegetarian: true, gluten_free: true, dairy_free: true, nut_free: true, halal: true, kosher: true }, critical_flags: [], notes: "Simple fries — but shared fryer risk is real. Model should note cross-contamination" },

  // === HIDDEN INGREDIENT TRAPS ===
  { name: "Pad Thai", description: "Rice noodles stir-fried with shrimp, bean sprouts, peanuts, lime, and tamarind sauce", category: "Thai", expected_flags: { vegan: false, vegetarian: false, gluten_free: null, dairy_free: true, nut_free: false, halal: null, kosher: false }, critical_flags: ["nut_free", "gluten_free"], notes: "Contains peanuts (explicit), fish sauce (hidden), shrimp (not kosher)" },
  { name: "Miso Soup", description: "Traditional dashi broth with tofu, wakame seaweed, and green onion", category: "Japanese", expected_flags: { vegan: false, vegetarian: false, gluten_free: null, dairy_free: true, nut_free: true, halal: null, kosher: null }, critical_flags: ["nut_free"], notes: "TRAP: Dashi is made from bonito (fish) — NOT vegan/vegetarian" },
  { name: "Tom Yum Soup", description: "Spicy and sour Thai soup with shrimp, mushrooms, lemongrass, and galangal", category: "Thai", expected_flags: { vegan: false, vegetarian: false, gluten_free: true, dairy_free: true, nut_free: true, halal: null, kosher: false }, critical_flags: ["nut_free"], notes: "Fish sauce is standard — should flag. Shrimp = not kosher" },
  { name: "Vegetable Fried Rice", description: "Wok-fried jasmine rice with mixed vegetables, egg, soy sauce, and sesame oil", category: "Chinese", expected_flags: { vegan: false, vegetarian: true, gluten_free: false, dairy_free: true, nut_free: true, halal: true, kosher: true }, critical_flags: ["nut_free", "gluten_free"], notes: "Egg = not vegan. Soy sauce = not GF (contains wheat)" },
  { name: "Pesto Pasta", description: "Penne with house-made basil pesto, cherry tomatoes, and pine nuts", category: "Italian", expected_flags: { vegan: false, vegetarian: true, gluten_free: false, dairy_free: false, nut_free: false, halal: true, kosher: true }, critical_flags: ["nut_free", "dairy_free"], notes: "Pesto has parmesan (dairy) and pine nuts (tree nut)" },

  // === ALLERGEN-CRITICAL (false positive = danger) ===
  { name: "Kung Pao Chicken", description: "Spicy diced chicken with peanuts, dried chilies, and Sichuan peppercorns", category: "Chinese", expected_flags: { vegan: false, vegetarian: false, gluten_free: false, dairy_free: true, nut_free: false, halal: null, kosher: null }, critical_flags: ["nut_free", "gluten_free"], notes: "Explicit peanuts — nut_free MUST be false" },
  { name: "Baklava", description: "Layers of phyllo dough filled with chopped walnuts and pistachios, sweetened with honey syrup", category: "Desserts", expected_flags: { vegan: false, vegetarian: true, gluten_free: false, dairy_free: null, nut_free: false, halal: true, kosher: null }, critical_flags: ["nut_free", "gluten_free"], notes: "Multiple tree nuts — nut_free MUST be false" },
  { name: "Shrimp Tempura", description: "Battered and deep-fried shrimp served with tentsuyu dipping sauce", category: "Japanese", expected_flags: { vegan: false, vegetarian: false, gluten_free: false, dairy_free: true, nut_free: true, halal: null, kosher: false }, critical_flags: ["gluten_free"], notes: "Tempura batter = wheat flour. Shrimp = not kosher" },
  { name: "Thai Green Curry", description: "Coconut milk curry with chicken, Thai basil, bamboo shoots, and green chilies", category: "Thai", expected_flags: { vegan: false, vegetarian: false, gluten_free: true, dairy_free: true, nut_free: null, halal: null, kosher: null }, critical_flags: ["nut_free"], notes: "Green curry paste may contain shrimp paste. Some recipes use peanuts" },
  { name: "Tres Leches Cake", description: "Sponge cake soaked in three kinds of milk: evaporated, condensed, and heavy cream", category: "Desserts", expected_flags: { vegan: false, vegetarian: true, gluten_free: false, dairy_free: false, nut_free: true, halal: true, kosher: null }, critical_flags: ["dairy_free", "gluten_free"], notes: "Three milks — dairy_free MUST be false" },

  // === AMBIGUOUS / REQUIRES REASONING ===
  { name: "Falafel Wrap", description: "Crispy chickpea fritters in warm pita with tahini, pickled vegetables, and fresh herbs", category: "Middle Eastern", expected_flags: { vegan: true, vegetarian: true, gluten_free: false, dairy_free: true, nut_free: null, halal: true, kosher: true }, critical_flags: ["nut_free", "gluten_free"], notes: "Tahini is sesame (not a tree nut) but some consider it allergenic. Pita = gluten" },
  { name: "Avocado Toast", description: "Sourdough bread topped with smashed avocado, cherry tomatoes, red pepper flakes, and a poached egg", category: "Breakfast", expected_flags: { vegan: false, vegetarian: true, gluten_free: false, dairy_free: true, nut_free: true, halal: true, kosher: true }, critical_flags: ["gluten_free"], notes: "Egg = not vegan. Sourdough = gluten" },
  { name: "Butter Chicken", description: "Tender chicken in a rich tomato-cream sauce with garam masala and fenugreek", category: "Indian", expected_flags: { vegan: false, vegetarian: false, gluten_free: true, dairy_free: false, nut_free: null, halal: null, kosher: null }, critical_flags: ["dairy_free", "nut_free"], notes: "Butter + cream = not dairy free. Some recipes use cashew paste" },
  { name: "Fish Tacos", description: "Beer-battered cod in corn tortillas with cabbage slaw, lime crema, and pickled onion", category: "Mexican", expected_flags: { vegan: false, vegetarian: false, gluten_free: false, dairy_free: false, nut_free: true, halal: null, kosher: null }, critical_flags: ["gluten_free", "nut_free"], notes: "Beer batter = gluten. Crema = dairy. Halal questionable (beer/alcohol)" },
  { name: "Hummus Plate", description: "Creamy chickpea hummus with olive oil, paprika, served with warm pita and vegetables", category: "Middle Eastern", expected_flags: { vegan: true, vegetarian: true, gluten_free: false, dairy_free: true, nut_free: true, halal: true, kosher: true }, critical_flags: ["gluten_free"], notes: "Pita = not GF. Hummus itself is vegan" },

  // === MORE VARIETY ===
  { name: "Sushi Platter", description: "Assorted nigiri and maki rolls: salmon, tuna, yellowtail, shrimp, and California roll", category: "Japanese", expected_flags: { vegan: false, vegetarian: false, gluten_free: false, dairy_free: true, nut_free: true, halal: null, kosher: false }, critical_flags: ["gluten_free"], notes: "Soy sauce = wheat. Imitation crab = shellfish. Rice vinegar usually OK" },
  { name: "Mac and Cheese", description: "Elbow macaroni in a blend of cheddar, gruyere, and cream sauce, topped with breadcrumb crust", category: "Comfort Food", expected_flags: { vegan: false, vegetarian: true, gluten_free: false, dairy_free: false, nut_free: true, halal: true, kosher: null }, critical_flags: ["dairy_free", "gluten_free"], notes: "Obvious dairy + gluten" },
  { name: "Chicken Tikka Masala", description: "Marinated chicken pieces in spiced tomato-yogurt gravy with basmati rice", category: "Indian", expected_flags: { vegan: false, vegetarian: false, gluten_free: true, dairy_free: false, nut_free: null, halal: null, kosher: null }, critical_flags: ["dairy_free", "nut_free"], notes: "Yogurt = dairy. Some recipes use almond/cashew cream" },
  { name: "Poke Bowl", description: "Fresh ahi tuna, edamame, avocado, seaweed salad, pickled ginger over sushi rice with ponzu", category: "Hawaiian", expected_flags: { vegan: false, vegetarian: false, gluten_free: false, dairy_free: true, nut_free: true, halal: null, kosher: null }, critical_flags: ["gluten_free", "nut_free"], notes: "Ponzu/soy sauce = wheat" },
  { name: "Veggie Burger", description: "House-made black bean patty with lettuce, tomato, pickles on a brioche bun", category: "Burgers", expected_flags: { vegan: false, vegetarian: true, gluten_free: false, dairy_free: false, nut_free: true, halal: true, kosher: true }, critical_flags: ["gluten_free"], notes: "Brioche bun has egg + butter (not vegan, not dairy-free)" },

  // === TRICKY EDGE CASES ===
  { name: "Worcestershire Glazed Steak", description: "8oz ribeye with Worcestershire reduction, roasted garlic mashed potatoes", category: "Steaks", expected_flags: { vegan: false, vegetarian: false, gluten_free: null, dairy_free: false, nut_free: true, halal: null, kosher: null }, critical_flags: ["nut_free"], notes: "Worcestershire contains anchovies. Mashed potatoes have butter/cream" },
  { name: "Spring Rolls (Fresh)", description: "Rice paper rolls with shrimp, vermicelli noodles, herbs, and peanut dipping sauce", category: "Vietnamese", expected_flags: { vegan: false, vegetarian: false, gluten_free: true, dairy_free: true, nut_free: false, halal: null, kosher: false }, critical_flags: ["nut_free"], notes: "Peanut sauce explicit. Rice paper = GF. Shrimp = not kosher" },
  { name: "Chocolate Lava Cake", description: "Warm dark chocolate cake with a molten center, served with vanilla ice cream", category: "Desserts", expected_flags: { vegan: false, vegetarian: true, gluten_free: false, dairy_free: false, nut_free: true, halal: true, kosher: null }, critical_flags: ["dairy_free", "gluten_free", "nut_free"], notes: "Chocolate, butter, cream, flour. Some chocolate has trace nuts" },
  { name: "Bibimbap", description: "Korean rice bowl with sauteed vegetables, gochujang, fried egg, and beef", category: "Korean", expected_flags: { vegan: false, vegetarian: false, gluten_free: false, dairy_free: true, nut_free: null, halal: null, kosher: null }, critical_flags: ["gluten_free", "nut_free"], notes: "Gochujang often contains wheat. Sesame oil common. Some add pine nuts" },
  { name: "Lobster Bisque", description: "Rich and creamy lobster soup with sherry, tarragon, and a swirl of cream", category: "Soups", expected_flags: { vegan: false, vegetarian: false, gluten_free: false, dairy_free: false, nut_free: true, halal: false, kosher: false }, critical_flags: ["dairy_free"], notes: "Cream = dairy. Flour roux = gluten. Sherry = alcohol (not halal). Shellfish = not kosher" },

  // === MORE ALLERGEN TRAPS ===
  { name: "Granola Parfait", description: "Greek yogurt layered with house granola, mixed berries, and honey drizzle", category: "Breakfast", expected_flags: { vegan: false, vegetarian: true, gluten_free: false, dairy_free: false, nut_free: null, halal: true, kosher: true }, critical_flags: ["nut_free", "dairy_free"], notes: "Granola often has nuts — should be null or false. Yogurt = dairy" },
  { name: "Bruschetta", description: "Toasted ciabatta topped with diced tomatoes, fresh basil, garlic, and extra virgin olive oil", category: "Appetizers", expected_flags: { vegan: true, vegetarian: true, gluten_free: false, dairy_free: true, nut_free: true, halal: true, kosher: true }, critical_flags: ["gluten_free"], notes: "Ciabatta = wheat/gluten" },
  { name: "Chicken Satay", description: "Grilled chicken skewers marinated in turmeric and lemongrass, served with peanut sauce", category: "Thai", expected_flags: { vegan: false, vegetarian: false, gluten_free: true, dairy_free: true, nut_free: false, halal: null, kosher: null }, critical_flags: ["nut_free"], notes: "Explicit peanut sauce — nut_free MUST be false" },
  { name: "Ramen (Tonkotsu)", description: "Rich pork bone broth with chashu pork, soft-boiled egg, nori, bamboo shoots, and ramen noodles", category: "Japanese", expected_flags: { vegan: false, vegetarian: false, gluten_free: false, dairy_free: true, nut_free: true, halal: false, kosher: false }, critical_flags: ["gluten_free"], notes: "Ramen noodles = wheat. Pork = not halal/kosher" },
  { name: "Caprese Salad", description: "Sliced fresh mozzarella, heirloom tomatoes, and basil with balsamic reduction", category: "Salads", expected_flags: { vegan: false, vegetarian: true, gluten_free: true, dairy_free: false, nut_free: true, halal: true, kosher: true }, critical_flags: ["dairy_free"], notes: "Mozzarella = dairy. Otherwise simple and safe" },

  { name: "Eggplant Parmesan", description: "Breaded and fried eggplant layered with marinara sauce and melted mozzarella", category: "Italian", expected_flags: { vegan: false, vegetarian: true, gluten_free: false, dairy_free: false, nut_free: true, halal: true, kosher: true }, critical_flags: ["gluten_free", "dairy_free"], notes: "Breading = gluten. Cheese = dairy" },
  { name: "Acai Bowl", description: "Blended acai with banana and almond milk, topped with granola, coconut flakes, and honey", category: "Breakfast", expected_flags: { vegan: false, vegetarian: true, gluten_free: null, dairy_free: true, nut_free: false, halal: true, kosher: true }, critical_flags: ["nut_free"], notes: "Almond milk = tree nut. Honey = not vegan. Granola may have nuts/wheat" },
  { name: "Clam Chowder", description: "New England style cream-based soup with clams, potatoes, celery, and bacon", category: "Soups", expected_flags: { vegan: false, vegetarian: false, gluten_free: false, dairy_free: false, nut_free: true, halal: false, kosher: false }, critical_flags: ["dairy_free"], notes: "Cream = dairy. Flour roux = gluten. Bacon = not halal. Clams = not kosher" },
  { name: "Fettuccine Alfredo", description: "Fresh fettuccine in a classic butter and parmesan cream sauce", category: "Italian", expected_flags: { vegan: false, vegetarian: true, gluten_free: false, dairy_free: false, nut_free: true, halal: true, kosher: true }, critical_flags: ["dairy_free", "gluten_free"], notes: "Butter + cream + parmesan = dairy. Pasta = gluten" },

  { name: "Shakshuka", description: "Poached eggs in spiced tomato and bell pepper sauce with cumin and paprika", category: "Middle Eastern", expected_flags: { vegan: false, vegetarian: true, gluten_free: true, dairy_free: true, nut_free: true, halal: true, kosher: true }, critical_flags: [], notes: "Egg = not vegan but vegetarian. Otherwise simple" },
  { name: "Lamb Gyro", description: "Shaved lamb with tzatziki, lettuce, tomato, and red onion in warm pita", category: "Greek", expected_flags: { vegan: false, vegetarian: false, gluten_free: false, dairy_free: false, nut_free: true, halal: null, kosher: null }, critical_flags: ["gluten_free", "dairy_free"], notes: "Pita = gluten. Tzatziki = dairy (yogurt). Halal depends on slaughter" },
  { name: "Mushroom Risotto", description: "Arborio rice slowly cooked with wild mushrooms, white wine, butter, and parmesan", category: "Italian", expected_flags: { vegan: false, vegetarian: true, gluten_free: true, dairy_free: false, nut_free: true, halal: false, kosher: true }, critical_flags: ["dairy_free"], notes: "Butter + parmesan = dairy. White wine = not halal. Rice = GF" },
  { name: "BBQ Pulled Pork Sandwich", description: "Slow-smoked pulled pork with tangy BBQ sauce on a toasted brioche bun with coleslaw", category: "BBQ", expected_flags: { vegan: false, vegetarian: false, gluten_free: false, dairy_free: null, nut_free: true, halal: false, kosher: false }, critical_flags: ["gluten_free"], notes: "Pork = not halal/kosher. Brioche = gluten + butter. Coleslaw may have mayo" },
  { name: "Edamame", description: "Steamed young soybeans with sea salt", category: "Appetizers", expected_flags: { vegan: true, vegetarian: true, gluten_free: true, dairy_free: true, nut_free: true, halal: true, kosher: true }, critical_flags: [], notes: "Simple plant dish — all true. Soy allergy is separate from nut allergy" },

  { name: "Creme Brulee", description: "Classic vanilla custard with a caramelized sugar crust", category: "Desserts", expected_flags: { vegan: false, vegetarian: true, gluten_free: true, dairy_free: false, nut_free: true, halal: true, kosher: null }, critical_flags: ["dairy_free"], notes: "Cream + egg yolks = not vegan. Dairy heavy. No flour though" },
  { name: "Chicken Wings (Buffalo)", description: "Deep-fried chicken wings tossed in spicy buffalo sauce, served with blue cheese dip and celery", category: "Appetizers", expected_flags: { vegan: false, vegetarian: false, gluten_free: null, dairy_free: false, nut_free: true, halal: null, kosher: null }, critical_flags: ["dairy_free", "gluten_free"], notes: "Blue cheese = dairy. Some wings are dusted in flour. Buffalo sauce has butter" },
  { name: "Tofu Stir Fry", description: "Crispy tofu with broccoli, bell peppers, snap peas in garlic ginger soy sauce", category: "Chinese", expected_flags: { vegan: true, vegetarian: true, gluten_free: false, dairy_free: true, nut_free: true, halal: true, kosher: true }, critical_flags: ["gluten_free"], notes: "Soy sauce = wheat/gluten. Otherwise plant-based" },
  { name: "Tiramisu", description: "Layers of espresso-soaked ladyfingers with mascarpone cream and cocoa powder", category: "Desserts", expected_flags: { vegan: false, vegetarian: true, gluten_free: false, dairy_free: false, nut_free: true, halal: null, kosher: null }, critical_flags: ["dairy_free", "gluten_free"], notes: "Mascarpone = dairy. Ladyfingers = wheat. Some recipes use Marsala wine (alcohol)" },
  { name: "Tabbouleh", description: "Fresh parsley, bulgur wheat, tomatoes, mint, lemon juice, and olive oil", category: "Middle Eastern", expected_flags: { vegan: true, vegetarian: true, gluten_free: false, dairy_free: true, nut_free: true, halal: true, kosher: true }, critical_flags: ["gluten_free"], notes: "Bulgur = wheat = gluten" },
];

// ─── 20 REVIEW SETS FOR SUMMARY TESTING ────────────────────
export const TEST_REVIEW_SETS: TestReviewSet[] = [
  {
    dish_name: "Pad Thai",
    restaurant_name: "Thai Orchid",
    reviews: [
      { text: "The Pad Thai here is incredible - perfect balance of sweet and sour. Noodles are cooked just right, not too soft. The peanuts add a great crunch. Be warned though, it's spicier than most places!", rating: 5, source: "google" },
      { text: "Ordered the pad thai and it was good but the portion was smaller than expected for $16. Shrimp were fresh though and they don't skimp on the lime wedges.", rating: 4, source: "yelp" },
      { text: "Best pad thai in the city hands down. The tamarind sauce is homemade and you can tell. My friend with a nut allergy asked for no peanuts and they accommodated perfectly.", rating: 5, source: "google" },
      { text: "Pad thai was decent but nothing special. A bit too oily for my taste. The shrimp were overcooked this time.", rating: 3, source: "google" },
    ],
    expected_themes: ["spicier than expected", "peanut allergy accommodation", "good tamarind sauce", "portion size concern"],
  },
  {
    dish_name: "Margherita Pizza",
    restaurant_name: "Napoli Authentic",
    reviews: [
      { text: "This margherita pizza is the real deal. San Marzano tomatoes, buffalo mozzarella, and the dough has that perfect char from the wood-fired oven. It's almost too good.", rating: 5, source: "google" },
      { text: "The margherita is simple but perfect. Basil is fresh, cheese melts beautifully. Only complaint is it comes out fast but gets cold quickly because it's so thin.", rating: 4, source: "yelp" },
      { text: "We come here specifically for the margherita. It's authentic Neapolitan style - thin center, puffy cornicione. The tomato sauce is bright and not overcooked.", rating: 5, source: "google" },
    ],
    expected_themes: ["authentic Neapolitan", "wood-fired", "thin crust", "cools quickly"],
  },
  {
    dish_name: "Butter Chicken",
    restaurant_name: "Spice Garden",
    reviews: [
      { text: "Butter chicken is creamy and flavorful without being too heavy. The spice level is perfect for someone who doesn't like it too hot. Naan bread is great for sopping up the sauce.", rating: 5, source: "google" },
      { text: "The butter chicken was way too sweet for my taste. It tasted more like a tomato cream soup than authentic Indian curry. Disappointed.", rating: 2, source: "yelp" },
      { text: "Rich and comforting butter chicken. The chicken pieces are tender and plentiful. Generous portion that I split into two meals. Great value at $14.", rating: 4, source: "google" },
      { text: "I've had butter chicken all over the city and this is top 3. The sauce has depth - you can taste the garam masala and fenugreek. Not just cream and food coloring like some places.", rating: 5, source: "google" },
    ],
    expected_themes: ["creamy", "divisive on sweetness", "generous portions", "good value", "spice depth"],
  },
  {
    dish_name: "Caesar Salad",
    restaurant_name: "The Green Fork",
    reviews: [
      { text: "Caesar salad was fresh and crisp. The dressing is house-made and you can tell - it has that anchovy depth that bottled versions lack. Croutons are perfectly crunchy.", rating: 4, source: "google" },
      { text: "Ordered the caesar salad as a side. It was fine but nothing to write home about. Pretty standard.", rating: 3, source: "yelp" },
    ],
    expected_themes: ["house-made dressing", "anchovy flavor", "standard quality"],
  },
  {
    dish_name: "Chicken Tikka Masala",
    restaurant_name: "Bombay Bites",
    reviews: [
      { text: "The tikka masala is outstanding. Perfectly charred chicken pieces in a rich, slightly smoky sauce. It's not too spicy but has great flavor complexity.", rating: 5, source: "google" },
      { text: "Good tikka masala but I've had better. The chicken was a bit dry on this visit. The sauce itself was delicious though - creamy with a nice tomato tang.", rating: 3, source: "yelp" },
      { text: "This tikka masala ruined all other tikka masalas for me. The yogurt marinade makes the chicken so tender. Pairs perfectly with their garlic naan.", rating: 5, source: "google" },
    ],
    expected_themes: ["smoky flavor", "charred chicken", "inconsistent chicken texture", "good sauce"],
  },
  {
    dish_name: "Fish Tacos",
    restaurant_name: "Baja Fresh Co",
    reviews: [
      { text: "Best fish tacos I've had outside of Baja. The beer batter is light and crispy, not heavy. The lime crema ties everything together. Get the corn tortillas if you can.", rating: 5, source: "google" },
      { text: "Fish tacos were okay. The fish was fresh but the cabbage slaw was kind of soggy. Needed more lime. For $15 for two tacos, I expected more.", rating: 3, source: "yelp" },
      { text: "The fish tacos are a must-order. Cod is flaky and the batter doesn't overpower the fish. The pickled onions are a nice touch that adds acid and crunch.", rating: 4, source: "google" },
    ],
    expected_themes: ["light crispy batter", "fresh fish", "price concern", "good pickled onions"],
  },
  {
    dish_name: "Ramen (Tonkotsu)",
    restaurant_name: "Noodle House",
    reviews: [
      { text: "The tonkotsu ramen here is legit. Rich, milky pork broth that's been simmered for hours. The chashu melts in your mouth. Egg is perfectly soft-boiled with a runny yolk.", rating: 5, source: "google" },
      { text: "Good ramen but the broth was a bit too salty for me. Noodles were cooked well though and the portion is huge - I couldn't finish it.", rating: 4, source: "yelp" },
      { text: "This ramen is my comfort food. The broth is so rich and collagen-heavy that it coats your lips. They let you customize noodle firmness which is a great touch.", rating: 5, source: "google" },
      { text: "Tonkotsu was solid. Nothing mind-blowing but consistently good every time I come. The bamboo shoots are always fresh.", rating: 4, source: "google" },
    ],
    expected_themes: ["rich pork broth", "large portions", "saltiness concern", "customizable noodles", "great chashu"],
  },
  {
    dish_name: "Falafel Wrap",
    restaurant_name: "Mediterranean Grill",
    reviews: [
      { text: "The falafel wrap is my go-to lunch. Falafel is crispy outside, fluffy inside. The tahini sauce is perfectly balanced. Super filling for just $9.", rating: 5, source: "google" },
      { text: "Falafel was dry and crumbly this time. Usually it's great but today was off. The pickled vegetables saved it.", rating: 3, source: "yelp" },
    ],
    expected_themes: ["crispy falafel", "good value", "occasional consistency issues"],
  },
  {
    dish_name: "Acai Bowl",
    restaurant_name: "Sunrise Juice Bar",
    reviews: [
      { text: "Beautiful acai bowl with tons of toppings. The granola is house-made and not too sweet. Acai base is thick, not watery like some places. My only gripe is it melts fast.", rating: 4, source: "google" },
      { text: "The acai bowl is Instagram-worthy and actually tastes as good as it looks. Fresh berries on top and the coconut flakes add nice texture. Pricey at $14 though.", rating: 4, source: "yelp" },
      { text: "Love their acai bowls. They use real acai, not the powdered stuff. You can taste the difference. The almond milk base makes it extra creamy.", rating: 5, source: "google" },
    ],
    expected_themes: ["thick acai base", "house-made granola", "melts quickly", "pricey", "real acai"],
  },
  {
    dish_name: "Mac and Cheese",
    restaurant_name: "Comfort Kitchen",
    reviews: [
      { text: "This mac and cheese is next level. They use gruyere and sharp cheddar and the breadcrumb top is golden and crunchy. It's pure comfort in a bowl.", rating: 5, source: "google" },
      { text: "Mac and cheese was too rich for me - I felt sick after eating the whole bowl. The cheese blend is intense. Would recommend sharing.", rating: 3, source: "yelp" },
      { text: "Best mac and cheese in town. Creamy, cheesy, perfectly baked. The portion is enormous. Pro tip: add the bacon for $2 more.", rating: 5, source: "google" },
    ],
    expected_themes: ["rich cheese blend", "crunchy breadcrumb top", "large portions", "very rich/heavy"],
  },
  {
    dish_name: "Poke Bowl",
    restaurant_name: "Pacific Catch",
    reviews: [
      { text: "Fresh poke bowl with generous chunks of ahi tuna. The ponzu sauce is tangy and doesn't overpower the fish. Edamame adds nice protein.", rating: 4, source: "google" },
      { text: "The poke here is fresh and well-seasoned. My only issue is the rice portion is huge compared to the fish. I'd pay extra for more tuna.", rating: 3, source: "yelp" },
    ],
    expected_themes: ["fresh tuna", "good ponzu", "rice-heavy ratio"],
  },
  {
    dish_name: "Mushroom Risotto",
    restaurant_name: "Trattoria Bella",
    reviews: [
      { text: "The mushroom risotto is phenomenal. Perfectly creamy with an incredible depth of earthy flavor from the wild mushrooms. The parmesan is shaved on top tableside.", rating: 5, source: "google" },
      { text: "Risotto was good but took 25 minutes to come out. When it arrived it was delicious - al dente rice, rich and buttery. Just be patient.", rating: 4, source: "yelp" },
      { text: "This risotto transported me to Italy. Each grain of rice is perfectly cooked with a slight bite. The truffle oil drizzle is subtle but elevating.", rating: 5, source: "google" },
    ],
    expected_themes: ["earthy mushroom flavor", "perfectly creamy", "long wait time", "truffle oil"],
  },
  {
    dish_name: "Chicken Wings (Buffalo)",
    restaurant_name: "Wing Zone",
    reviews: [
      { text: "These buffalo wings are fire! Crispy skin, juicy meat, and the sauce has real kick. The blue cheese dip is chunky and homemade. Celery is fresh and cold - perfect contrast.", rating: 5, source: "google" },
      { text: "Wings are good but inconsistent. Sometimes crispy, sometimes soggy. When they're on, they're on. The spice level is solid medium heat.", rating: 3, source: "yelp" },
      { text: "Great buffalo wings. They fry them to order so there's a 15 min wait but it's worth it. Get extra napkins - these are messy!", rating: 4, source: "google" },
    ],
    expected_themes: ["crispy skin", "good heat level", "inconsistent quality", "homemade blue cheese", "messy"],
  },
  {
    dish_name: "Shakshuka",
    restaurant_name: "Levant Kitchen",
    reviews: [
      { text: "The shakshuka arrives sizzling in a cast iron pan. Eggs are perfectly poached with runny yolks. The tomato sauce is smoky and well-spiced with cumin. Excellent with their fresh bread.", rating: 5, source: "google" },
      { text: "Shakshuka was good but the eggs were overcooked on my visit. The sauce had great flavor though - not just plain tomato, you can taste the bell peppers and spices.", rating: 3, source: "yelp" },
    ],
    expected_themes: ["cast iron presentation", "runny yolks important", "smoky tomato sauce", "egg doneness varies"],
  },
  {
    dish_name: "Tiramisu",
    restaurant_name: "Dolce Vita",
    reviews: [
      { text: "The tiramisu here is made fresh daily and you can tell. The mascarpone is light and airy, the espresso soaking is just right - not too wet, not too dry. Best in town.", rating: 5, source: "google" },
      { text: "Tiramisu was a bit too boozy for my taste. The Marsala wine was overpowering. If you like a strong alcohol flavor, you'll love it. For me, it was too much.", rating: 3, source: "yelp" },
      { text: "Perfect tiramisu. Creamy, coffee-forward, with a nice cocoa dusting. They serve a generous slice. Great way to end a meal here.", rating: 5, source: "google" },
    ],
    expected_themes: ["made fresh daily", "divisive on alcohol content", "light mascarpone", "generous portion"],
  },
  {
    dish_name: "Spring Rolls (Fresh)",
    restaurant_name: "Saigon Bistro",
    reviews: [
      { text: "These fresh spring rolls are so light and refreshing. You can see all the ingredients through the rice paper. The peanut dipping sauce is sweet and slightly spicy. Perfect appetizer.", rating: 5, source: "google" },
      { text: "Spring rolls were good but fell apart easily. The rice paper was too thin. Filling was fresh though - nice herbs, vermicelli, and plump shrimp.", rating: 3, source: "yelp" },
    ],
    expected_themes: ["light and refreshing", "good peanut sauce", "fragile wrapping", "fresh herbs"],
  },
  {
    dish_name: "Lobster Bisque",
    restaurant_name: "Harbor House",
    reviews: [
      { text: "The lobster bisque is rich and velvety with actual chunks of lobster meat. You can taste the sherry - it's refined, not a heavy cream bomb. Served with a warm roll on the side.", rating: 5, source: "google" },
      { text: "Good bisque but I expected more lobster for $18 a bowl. The broth itself is excellent - smooth and deeply flavored. Just wish there was more substance.", rating: 3, source: "yelp" },
      { text: "This bisque is what I dream about in winter. Warm, luxurious, and the tarragon adds an unexpected herbal note. Cup size is perfect as an appetizer.", rating: 5, source: "google" },
    ],
    expected_themes: ["velvety texture", "real lobster chunks", "price vs substance", "good sherry flavor"],
  },
  {
    dish_name: "Bibimbap",
    restaurant_name: "Seoul Kitchen",
    reviews: [
      { text: "The dolsot bibimbap comes in a scorching hot stone bowl. The rice gets this amazing crispy layer on the bottom. Gochujang is homemade and has great depth. Mix it all up!", rating: 5, source: "google" },
      { text: "Bibimbap was colorful and healthy-feeling. Lots of vegetables. The beef was a little tough but the fried egg on top was perfect. Good but not amazing.", rating: 3, source: "yelp" },
      { text: "Best bibimbap I've had. The stone pot keeps everything hot throughout the meal. I love how the egg gets all mixed in with the rice and veggies. Homemade kimchi on the side is a bonus.", rating: 5, source: "google" },
    ],
    expected_themes: ["hot stone bowl", "crispy rice bottom", "homemade gochujang", "tough beef occasionally"],
  },
  {
    dish_name: "Creme Brulee",
    restaurant_name: "Le Petit Bistro",
    reviews: [
      { text: "The creme brulee is classic perfection. The sugar crust cracks beautifully with the first tap of the spoon. Custard is silky smooth with real vanilla bean specks.", rating: 5, source: "google" },
      { text: "Creme brulee was served cold, which I prefer. The sugar was torched to a perfect amber. Only issue is the portion is small for $12. But quality over quantity I suppose.", rating: 4, source: "yelp" },
    ],
    expected_themes: ["perfect sugar crust", "real vanilla bean", "small portion", "silky custard"],
  },
  {
    dish_name: "Veggie Burger",
    restaurant_name: "Green Plate",
    reviews: [
      { text: "This is the first veggie burger that actually tastes good to me as a meat eater. The black bean patty is seasoned well and has a nice charred exterior. Brioche bun is soft and buttery.", rating: 4, source: "google" },
      { text: "Veggie burger fell apart after two bites. Frustrating. The flavor was there but it was impossible to eat like a burger. Had to resort to fork and knife.", rating: 2, source: "yelp" },
      { text: "Great veggie burger option. The patty holds together better than most bean burgers. Toppings are fresh. My only wish is they offered a vegan bun option since the brioche has egg.", rating: 4, source: "google" },
    ],
    expected_themes: ["appeals to meat eaters", "structural integrity issues", "good seasoning", "no vegan bun option"],
  },
];
