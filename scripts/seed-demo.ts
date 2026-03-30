/**
 * Seed script for NutriScout demo data.
 * Populates the database with realistic East Village NYC restaurants and dishes.
 *
 * Usage: npx tsx scripts/seed-demo.ts
 */

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// East Village area coordinates
const BASE_LAT = 40.7264;
const BASE_LNG = -73.9878;

function jitter(base: number, range = 0.005): number {
  return base + (Math.random() - 0.5) * range;
}

const RESTAURANTS = [
  { name: "Bangkok Bowl", cuisine: ["Thai"], price: 2, rating: 4.3, yelp: 4.0 },
  { name: "Taqueria Buena", cuisine: ["Mexican"], price: 1, rating: 4.5, yelp: 4.5 },
  { name: "Trattoria Napoli", cuisine: ["Italian"], price: 3, rating: 4.2, yelp: 4.0 },
  { name: "Spice Route", cuisine: ["Indian"], price: 2, rating: 4.6, yelp: 4.5 },
  { name: "Sakura Sushi", cuisine: ["Japanese"], price: 3, rating: 4.4, yelp: 4.0 },
  { name: "The Burger Joint", cuisine: ["American"], price: 2, rating: 4.1, yelp: 3.5 },
  { name: "Olive & Vine", cuisine: ["Mediterranean"], price: 2, rating: 4.5, yelp: 4.5 },
  { name: "Pho Saigon", cuisine: ["Vietnamese"], price: 1, rating: 4.3, yelp: 4.0 },
  { name: "Seoul Kitchen", cuisine: ["Korean"], price: 2, rating: 4.4, yelp: 4.0 },
  { name: "Dragon Palace", cuisine: ["Chinese"], price: 2, rating: 4.0, yelp: 3.5 },
  { name: "Le Petit Bistro", cuisine: ["French"], price: 3, rating: 4.6, yelp: 4.5 },
  { name: "Athena's Table", cuisine: ["Greek"], price: 2, rating: 4.3, yelp: 4.0 },
  { name: "Green Leaf Cafe", cuisine: ["American"], price: 2, rating: 4.7, yelp: 4.5 },
  { name: "Curry House", cuisine: ["Indian"], price: 1, rating: 4.2, yelp: 4.0 },
  { name: "Noodle Lab", cuisine: ["Japanese", "Chinese"], price: 2, rating: 4.3, yelp: 4.0 },
  { name: "El Fuego", cuisine: ["Mexican"], price: 2, rating: 4.4, yelp: 4.0 },
  { name: "Pasta Fresca", cuisine: ["Italian"], price: 2, rating: 4.1, yelp: 3.5 },
  { name: "Wild Poke", cuisine: ["Japanese"], price: 2, rating: 4.5, yelp: 4.5 },
];

interface DishDef {
  name: string;
  desc: string;
  price: number;
  category: string;
  cal: [number, number];
  protein: [number, number];
  carbs: [number, number];
  fat: [number, number];
  flags: Record<string, boolean>;
  confidence: number;
  source: "vision_ai" | "usda_match" | "restaurant_published";
  photos: number;
  ingredients: string;
}

const DISH_TEMPLATES: Record<string, DishDef[]> = {
  Thai: [
    { name: "Pad Thai", desc: "Classic stir-fried rice noodles with shrimp, peanuts, and bean sprouts", price: 14.95, category: "Mains", cal: [480, 560], protein: [18, 24], carbs: [55, 65], fat: [18, 24], flags: { gluten_free: true }, confidence: 0.85, source: "vision_ai", photos: 8, ingredients: "rice noodles, shrimp, eggs, peanuts, bean sprouts, lime, fish sauce" },
    { name: "Green Curry", desc: "Coconut milk curry with Thai basil, bamboo shoots, and vegetables", price: 13.95, category: "Mains", cal: [420, 520], protein: [22, 28], carbs: [25, 35], fat: [28, 36], flags: { gluten_free: true, dairy_free: true }, confidence: 0.82, source: "vision_ai", photos: 6, ingredients: "coconut milk, green curry paste, chicken, bamboo shoots, Thai basil, eggplant" },
    { name: "Mango Sticky Rice", desc: "Sweet sticky rice with fresh mango and coconut cream", price: 8.95, category: "Desserts", cal: [350, 420], protein: [4, 6], carbs: [65, 78], fat: [10, 14], flags: { vegan: true, gluten_free: true, nut_free: true }, confidence: 0.9, source: "vision_ai", photos: 5, ingredients: "sticky rice, mango, coconut cream, sugar" },
    { name: "Tom Kha Soup", desc: "Coconut chicken soup with galangal and lemongrass", price: 11.95, category: "Soups", cal: [280, 350], protein: [20, 26], carbs: [12, 18], fat: [18, 24], flags: { gluten_free: true, dairy_free: true }, confidence: 0.78, source: "vision_ai", photos: 4, ingredients: "coconut milk, chicken, galangal, lemongrass, mushrooms, lime" },
    { name: "Papaya Salad", desc: "Spicy shredded green papaya with cherry tomatoes and peanuts", price: 9.95, category: "Salads", cal: [180, 240], protein: [5, 8], carbs: [22, 30], fat: [8, 12], flags: { gluten_free: true, dairy_free: true }, confidence: 0.88, source: "vision_ai", photos: 7, ingredients: "green papaya, tomatoes, peanuts, lime, fish sauce, chilies" },
    { name: "Basil Fried Rice", desc: "Wok-fried rice with Thai basil, chilies, and choice of protein", price: 12.95, category: "Mains", cal: [520, 620], protein: [20, 28], carbs: [65, 78], fat: [18, 25], flags: { gluten_free: true, dairy_free: true }, confidence: 0.8, source: "vision_ai", photos: 5, ingredients: "jasmine rice, Thai basil, garlic, chilies, soy sauce, chicken" },
    { name: "Spring Rolls", desc: "Fresh vegetable rice paper rolls with peanut dipping sauce", price: 7.95, category: "Appetizers", cal: [180, 240], protein: [6, 10], carbs: [25, 32], fat: [5, 9], flags: { vegan: true, gluten_free: true }, confidence: 0.85, source: "vision_ai", photos: 6, ingredients: "rice paper, vermicelli, lettuce, carrots, cucumber, mint, peanut sauce" },
    { name: "Thai Iced Tea", desc: "Sweet and creamy Thai tea served over ice", price: 4.95, category: "Drinks", cal: [180, 230], protein: [2, 4], carbs: [32, 40], fat: [5, 8], flags: { vegetarian: true, gluten_free: true, nut_free: true }, confidence: 0.9, source: "usda_match", photos: 3, ingredients: "Thai tea mix, sugar, condensed milk, ice" },
  ],
  Mexican: [
    { name: "Carne Asada Burrito", desc: "Grilled steak burrito with rice, beans, guacamole, and pico de gallo", price: 13.95, category: "Mains", cal: [680, 820], protein: [35, 45], carbs: [65, 80], fat: [28, 38], flags: { nut_free: true }, confidence: 0.82, source: "vision_ai", photos: 6, ingredients: "flour tortilla, grilled steak, rice, beans, guacamole, salsa, sour cream" },
    { name: "Chicken Tacos", desc: "Three soft corn tacos with grilled chicken, onion, and cilantro", price: 11.95, category: "Mains", cal: [380, 460], protein: [28, 35], carbs: [32, 42], fat: [14, 20], flags: { gluten_free: true, nut_free: true }, confidence: 0.85, source: "vision_ai", photos: 7, ingredients: "corn tortillas, chicken, onion, cilantro, lime, salsa verde" },
    { name: "Veggie Burrito Bowl", desc: "Rice bowl with black beans, grilled vegetables, guacamole, and salsa", price: 12.95, category: "Mains", cal: [450, 540], protein: [15, 20], carbs: [62, 74], fat: [15, 22], flags: { vegan: true, gluten_free: true, nut_free: true }, confidence: 0.88, source: "vision_ai", photos: 8, ingredients: "rice, black beans, grilled peppers, corn, guacamole, salsa, lettuce" },
    { name: "Queso Fundido", desc: "Melted cheese dip with chorizo and peppers", price: 9.95, category: "Appetizers", cal: [350, 430], protein: [18, 24], carbs: [12, 18], fat: [25, 32], flags: { gluten_free: true, nut_free: true }, confidence: 0.75, source: "vision_ai", photos: 4, ingredients: "oaxaca cheese, chorizo, poblano peppers, corn chips" },
    { name: "Fish Tacos", desc: "Beer-battered fish tacos with cabbage slaw and chipotle crema", price: 13.95, category: "Mains", cal: [420, 520], protein: [24, 32], carbs: [38, 48], fat: [18, 26], flags: { nut_free: true }, confidence: 0.8, source: "vision_ai", photos: 5, ingredients: "flour tortillas, cod, cabbage, chipotle mayo, lime, cilantro" },
    { name: "Guacamole & Chips", desc: "Fresh guacamole made tableside with tortilla chips", price: 8.95, category: "Appetizers", cal: [320, 400], protein: [5, 8], carbs: [30, 40], fat: [22, 28], flags: { vegan: true, gluten_free: true, nut_free: true }, confidence: 0.9, source: "usda_match", photos: 6, ingredients: "avocado, tomato, onion, cilantro, lime, jalapeño, corn chips" },
    { name: "Churros", desc: "Crispy fried churros with chocolate dipping sauce", price: 7.95, category: "Desserts", cal: [380, 460], protein: [4, 6], carbs: [50, 62], fat: [18, 24], flags: { vegetarian: true, nut_free: true }, confidence: 0.85, source: "vision_ai", photos: 4, ingredients: "flour, sugar, cinnamon, eggs, chocolate sauce" },
    { name: "Horchata", desc: "Traditional rice and cinnamon drink", price: 4.50, category: "Drinks", cal: [180, 240], protein: [2, 4], carbs: [38, 48], fat: [3, 5], flags: { vegan: true, gluten_free: true, nut_free: true }, confidence: 0.88, source: "usda_match", photos: 2, ingredients: "rice, cinnamon, sugar, vanilla, water" },
  ],
  Italian: [
    { name: "Margherita Pizza", desc: "Wood-fired pizza with fresh mozzarella, tomato sauce, and basil", price: 16.95, category: "Mains", cal: [680, 820], protein: [25, 32], carbs: [75, 90], fat: [28, 36], flags: { vegetarian: true, nut_free: true }, confidence: 0.88, source: "vision_ai", photos: 10, ingredients: "pizza dough, mozzarella, San Marzano tomatoes, basil, olive oil" },
    { name: "Chicken Parmigiana", desc: "Breaded chicken cutlet with marinara and melted mozzarella", price: 18.95, category: "Mains", cal: [620, 760], protein: [42, 52], carbs: [35, 45], fat: [32, 42], flags: { nut_free: true }, confidence: 0.82, source: "vision_ai", photos: 6, ingredients: "chicken breast, breadcrumbs, marinara, mozzarella, parmesan, spaghetti" },
    { name: "Caprese Salad", desc: "Fresh mozzarella, heirloom tomatoes, and basil with balsamic glaze", price: 12.95, category: "Salads", cal: [280, 350], protein: [15, 20], carbs: [8, 14], fat: [20, 26], flags: { vegetarian: true, gluten_free: true, nut_free: true }, confidence: 0.92, source: "vision_ai", photos: 8, ingredients: "mozzarella, tomatoes, basil, olive oil, balsamic glaze" },
    { name: "Penne Arrabiata", desc: "Spicy tomato sauce with garlic and red chili flakes", price: 14.95, category: "Mains", cal: [480, 560], protein: [14, 18], carbs: [72, 85], fat: [14, 20], flags: { vegan: true, dairy_free: true, nut_free: true }, confidence: 0.85, source: "vision_ai", photos: 5, ingredients: "penne pasta, tomatoes, garlic, red chili, olive oil, parsley" },
    { name: "Tiramisu", desc: "Classic Italian coffee-flavored dessert with mascarpone cream", price: 10.95, category: "Desserts", cal: [380, 460], protein: [6, 10], carbs: [35, 45], fat: [24, 32], flags: { vegetarian: true, nut_free: true }, confidence: 0.8, source: "vision_ai", photos: 4, ingredients: "ladyfingers, mascarpone, espresso, cocoa, eggs, sugar" },
    { name: "Minestrone Soup", desc: "Hearty Italian vegetable soup with pasta and beans", price: 9.95, category: "Soups", cal: [220, 300], protein: [10, 14], carbs: [32, 42], fat: [6, 10], flags: { vegan: true, dairy_free: true, nut_free: true }, confidence: 0.86, source: "usda_match", photos: 4, ingredients: "kidney beans, pasta, zucchini, carrots, celery, tomatoes, spinach" },
    { name: "Bruschetta", desc: "Toasted bread topped with diced tomatoes, garlic, and basil", price: 8.95, category: "Appetizers", cal: [220, 280], protein: [5, 8], carbs: [28, 36], fat: [10, 14], flags: { vegan: true, dairy_free: true, nut_free: true }, confidence: 0.9, source: "usda_match", photos: 6, ingredients: "bread, tomatoes, garlic, basil, olive oil, balsamic" },
    { name: "Risotto ai Funghi", desc: "Creamy mushroom risotto with parmesan and truffle oil", price: 17.95, category: "Mains", cal: [520, 640], protein: [14, 18], carbs: [62, 75], fat: [22, 30], flags: { vegetarian: true, gluten_free: true, nut_free: true }, confidence: 0.78, source: "vision_ai", photos: 5, ingredients: "arborio rice, mixed mushrooms, parmesan, butter, white wine, truffle oil" },
  ],
  Indian: [
    { name: "Chicken Tikka Masala", desc: "Tender chicken in a creamy tomato-spiced sauce", price: 15.95, category: "Mains", cal: [480, 580], protein: [32, 40], carbs: [18, 26], fat: [28, 36], flags: { gluten_free: true, nut_free: true }, confidence: 0.85, source: "vision_ai", photos: 9, ingredients: "chicken, yogurt, tomatoes, cream, garam masala, cumin, coriander" },
    { name: "Chana Masala", desc: "Spiced chickpea curry with onion, tomato, and coriander", price: 12.95, category: "Mains", cal: [350, 430], protein: [14, 18], carbs: [48, 58], fat: [12, 18], flags: { vegan: true, gluten_free: true, dairy_free: true, nut_free: true }, confidence: 0.88, source: "vision_ai", photos: 6, ingredients: "chickpeas, tomatoes, onion, garlic, ginger, cumin, coriander, turmeric" },
    { name: "Garlic Naan", desc: "Soft leavened bread with garlic and butter", price: 3.95, category: "Breads", cal: [260, 320], protein: [7, 10], carbs: [40, 48], fat: [8, 12], flags: { vegetarian: true, nut_free: true }, confidence: 0.9, source: "usda_match", photos: 5, ingredients: "flour, yogurt, garlic, butter, yeast" },
    { name: "Palak Paneer", desc: "Cottage cheese cubes in a creamy spinach sauce", price: 13.95, category: "Mains", cal: [380, 460], protein: [18, 24], carbs: [15, 22], fat: [26, 34], flags: { vegetarian: true, gluten_free: true, nut_free: true }, confidence: 0.82, source: "vision_ai", photos: 5, ingredients: "paneer, spinach, cream, onion, garlic, ginger, garam masala" },
    { name: "Samosas (2)", desc: "Crispy pastry stuffed with spiced potatoes and peas", price: 6.95, category: "Appetizers", cal: [280, 350], protein: [6, 9], carbs: [32, 40], fat: [14, 20], flags: { vegan: true, dairy_free: true, nut_free: true }, confidence: 0.86, source: "vision_ai", photos: 7, ingredients: "pastry, potato, peas, cumin, coriander, turmeric" },
    { name: "Dal Tadka", desc: "Yellow lentils tempered with cumin, garlic, and ghee", price: 11.95, category: "Mains", cal: [300, 380], protein: [16, 22], carbs: [42, 52], fat: [8, 14], flags: { vegetarian: true, gluten_free: true, nut_free: true }, confidence: 0.84, source: "vision_ai", photos: 4, ingredients: "yellow lentils, ghee, cumin, garlic, onion, tomato, turmeric" },
    { name: "Mango Lassi", desc: "Sweet yogurt drink blended with mango pulp", price: 4.95, category: "Drinks", cal: [200, 260], protein: [6, 8], carbs: [38, 48], fat: [4, 7], flags: { vegetarian: true, gluten_free: true, nut_free: true }, confidence: 0.92, source: "usda_match", photos: 3, ingredients: "yogurt, mango, sugar, cardamom" },
    { name: "Tandoori Chicken", desc: "Yogurt-marinated chicken cooked in a clay oven", price: 14.95, category: "Mains", cal: [320, 400], protein: [38, 46], carbs: [5, 10], fat: [16, 22], flags: { gluten_free: true, dairy_free: false, nut_free: true }, confidence: 0.87, source: "vision_ai", photos: 6, ingredients: "chicken, yogurt, tandoori spices, lemon, garlic, ginger" },
  ],
  Japanese: [
    { name: "Salmon Sashimi", desc: "Fresh sliced salmon served with wasabi and pickled ginger", price: 16.95, category: "Sashimi", cal: [180, 240], protein: [28, 35], carbs: [2, 5], fat: [8, 12], flags: { gluten_free: true, dairy_free: true, nut_free: true }, confidence: 0.92, source: "vision_ai", photos: 8, ingredients: "fresh salmon, wasabi, pickled ginger, soy sauce" },
    { name: "Spicy Tuna Roll", desc: "Tuna mixed with spicy mayo and cucumber, topped with sesame", price: 13.95, category: "Rolls", cal: [320, 400], protein: [18, 24], carbs: [40, 50], fat: [10, 16], flags: { dairy_free: true }, confidence: 0.85, source: "vision_ai", photos: 7, ingredients: "tuna, spicy mayo, cucumber, rice, nori, sesame seeds" },
    { name: "Chicken Katsu Curry", desc: "Crispy breaded chicken with Japanese curry rice", price: 15.95, category: "Mains", cal: [680, 820], protein: [30, 38], carbs: [78, 92], fat: [28, 36], flags: { nut_free: true, dairy_free: true }, confidence: 0.8, source: "vision_ai", photos: 6, ingredients: "chicken breast, panko breadcrumbs, Japanese curry sauce, rice, carrots, potatoes" },
    { name: "Miso Soup", desc: "Traditional soybean paste soup with tofu and wakame seaweed", price: 4.95, category: "Soups", cal: [60, 90], protein: [4, 6], carbs: [6, 10], fat: [2, 4], flags: { vegan: true, gluten_free: false, dairy_free: true, nut_free: true }, confidence: 0.92, source: "usda_match", photos: 4, ingredients: "miso paste, tofu, wakame, dashi, green onion" },
    { name: "Poke Bowl", desc: "Fresh tuna and salmon over rice with avocado, edamame, and sesame", price: 17.95, category: "Mains", cal: [520, 640], protein: [32, 40], carbs: [48, 60], fat: [18, 26], flags: { gluten_free: true, dairy_free: true }, confidence: 0.86, source: "vision_ai", photos: 9, ingredients: "tuna, salmon, sushi rice, avocado, edamame, cucumber, sesame, soy sauce" },
    { name: "Edamame", desc: "Steamed soybeans with sea salt", price: 5.95, category: "Appetizers", cal: [120, 160], protein: [10, 14], carbs: [8, 12], fat: [5, 8], flags: { vegan: true, gluten_free: true, dairy_free: true, nut_free: true }, confidence: 0.95, source: "usda_match", photos: 5, ingredients: "edamame, sea salt" },
    { name: "Tempura Udon", desc: "Thick wheat noodles in broth with shrimp tempura", price: 14.95, category: "Mains", cal: [480, 580], protein: [20, 26], carbs: [62, 75], fat: [14, 22], flags: { dairy_free: true, nut_free: true }, confidence: 0.82, source: "vision_ai", photos: 5, ingredients: "udon noodles, shrimp, tempura batter, dashi, soy sauce, mirin" },
    { name: "Matcha Ice Cream", desc: "Rich green tea flavored ice cream", price: 6.95, category: "Desserts", cal: [200, 260], protein: [4, 6], carbs: [26, 34], fat: [10, 14], flags: { vegetarian: true, gluten_free: true, nut_free: true }, confidence: 0.88, source: "usda_match", photos: 3, ingredients: "cream, sugar, matcha powder, milk, egg yolks" },
  ],
  American: [
    { name: "Classic Cheeseburger", desc: "Angus beef patty with cheddar, lettuce, tomato, and pickles", price: 14.95, category: "Mains", cal: [650, 780], protein: [38, 46], carbs: [38, 48], fat: [35, 45], flags: { nut_free: true }, confidence: 0.85, source: "vision_ai", photos: 8, ingredients: "beef patty, cheddar, lettuce, tomato, pickles, brioche bun, ketchup" },
    { name: "Caesar Salad", desc: "Crisp romaine with parmesan, croutons, and house-made Caesar dressing", price: 11.95, category: "Salads", cal: [350, 430], protein: [12, 18], carbs: [18, 26], fat: [24, 32], flags: { nut_free: true }, confidence: 0.82, source: "vision_ai", photos: 6, ingredients: "romaine, parmesan, croutons, Caesar dressing, anchovy" },
    { name: "Grilled Chicken Breast", desc: "Herb-marinated chicken with roasted vegetables and quinoa", price: 16.95, category: "Mains", cal: [420, 520], protein: [42, 52], carbs: [28, 38], fat: [14, 20], flags: { gluten_free: true, dairy_free: true, nut_free: true }, confidence: 0.88, source: "vision_ai", photos: 7, ingredients: "chicken breast, quinoa, broccoli, bell peppers, herbs, olive oil" },
    { name: "Acai Bowl", desc: "Blended acai topped with granola, banana, berries, and honey", price: 12.95, category: "Breakfast", cal: [380, 460], protein: [8, 12], carbs: [62, 75], fat: [12, 18], flags: { vegan: false, vegetarian: true, gluten_free: false, dairy_free: true }, confidence: 0.84, source: "vision_ai", photos: 9, ingredients: "acai, banana, blueberries, strawberries, granola, honey, coconut" },
    { name: "Sweet Potato Fries", desc: "Crispy baked sweet potato fries with chipotle aioli", price: 7.95, category: "Sides", cal: [280, 350], protein: [3, 5], carbs: [40, 50], fat: [12, 18], flags: { vegan: false, gluten_free: true, dairy_free: false, nut_free: true }, confidence: 0.86, source: "vision_ai", photos: 5, ingredients: "sweet potatoes, olive oil, paprika, chipotle mayo" },
    { name: "Turkey Club", desc: "Triple-decker sandwich with turkey, bacon, lettuce, and tomato", price: 13.95, category: "Mains", cal: [550, 660], protein: [32, 40], carbs: [42, 52], fat: [25, 33], flags: { nut_free: true, dairy_free: true }, confidence: 0.8, source: "vision_ai", photos: 5, ingredients: "turkey, bacon, lettuce, tomato, mayo, sourdough bread" },
    { name: "Protein Smoothie", desc: "Whey protein with banana, peanut butter, and almond milk", price: 8.95, category: "Drinks", cal: [350, 420], protein: [30, 38], carbs: [32, 40], fat: [12, 18], flags: { vegetarian: true, gluten_free: true }, confidence: 0.9, source: "usda_match", photos: 3, ingredients: "whey protein, banana, peanut butter, almond milk, honey" },
    { name: "BBQ Chicken Wings", desc: "Crispy wings tossed in smoky BBQ sauce", price: 12.95, category: "Appetizers", cal: [480, 580], protein: [32, 40], carbs: [20, 28], fat: [28, 36], flags: { gluten_free: true, dairy_free: true, nut_free: true }, confidence: 0.82, source: "vision_ai", photos: 6, ingredients: "chicken wings, BBQ sauce, celery, ranch dressing" },
  ],
  Mediterranean: [
    { name: "Falafel Plate", desc: "Crispy chickpea falafel with hummus, tabbouleh, and pita", price: 13.95, category: "Mains", cal: [520, 640], protein: [18, 24], carbs: [58, 70], fat: [24, 32], flags: { vegan: true, dairy_free: true, nut_free: true }, confidence: 0.86, source: "vision_ai", photos: 7, ingredients: "chickpeas, parsley, onion, hummus, pita, pickled vegetables, tahini" },
    { name: "Chicken Shawarma", desc: "Spiced rotisserie chicken in warm pita with garlic sauce", price: 14.95, category: "Mains", cal: [480, 580], protein: [32, 40], carbs: [35, 45], fat: [20, 28], flags: { dairy_free: true, nut_free: true }, confidence: 0.84, source: "vision_ai", photos: 6, ingredients: "chicken, pita, pickled turnips, garlic sauce, tomato, lettuce" },
    { name: "Hummus & Pita", desc: "Creamy hummus drizzled with olive oil and warm pita triangles", price: 8.95, category: "Appetizers", cal: [320, 400], protein: [10, 14], carbs: [38, 48], fat: [15, 22], flags: { vegan: true, dairy_free: true, nut_free: true }, confidence: 0.9, source: "usda_match", photos: 5, ingredients: "chickpeas, tahini, lemon, garlic, olive oil, pita bread" },
    { name: "Grilled Lamb Kebab", desc: "Marinated lamb skewers with grilled vegetables and tzatziki", price: 18.95, category: "Mains", cal: [420, 520], protein: [35, 44], carbs: [12, 20], fat: [24, 32], flags: { gluten_free: true, nut_free: true }, confidence: 0.82, source: "vision_ai", photos: 5, ingredients: "lamb, bell peppers, onion, tzatziki, herbs, olive oil" },
    { name: "Greek Salad", desc: "Tomatoes, cucumbers, olives, red onion, and feta with oregano dressing", price: 11.95, category: "Salads", cal: [240, 310], protein: [8, 12], carbs: [12, 18], fat: [18, 24], flags: { vegetarian: true, gluten_free: true, nut_free: true }, confidence: 0.9, source: "usda_match", photos: 6, ingredients: "tomatoes, cucumbers, kalamata olives, red onion, feta, olive oil, oregano" },
    { name: "Baba Ganoush", desc: "Smoky roasted eggplant dip with tahini and lemon", price: 8.95, category: "Appetizers", cal: [180, 240], protein: [4, 6], carbs: [14, 20], fat: [12, 18], flags: { vegan: true, gluten_free: true, dairy_free: true, nut_free: true }, confidence: 0.88, source: "usda_match", photos: 4, ingredients: "eggplant, tahini, lemon, garlic, olive oil, parsley" },
    { name: "Baklava", desc: "Layers of phyllo dough with pistachios and honey syrup", price: 7.95, category: "Desserts", cal: [320, 400], protein: [6, 8], carbs: [38, 48], fat: [18, 24], flags: { vegetarian: true }, confidence: 0.85, source: "vision_ai", photos: 4, ingredients: "phyllo dough, pistachios, butter, honey, sugar, cardamom" },
    { name: "Lentil Soup", desc: "Hearty red lentil soup with cumin and lemon", price: 7.95, category: "Soups", cal: [220, 280], protein: [12, 16], carbs: [32, 40], fat: [5, 9], flags: { vegan: true, gluten_free: true, dairy_free: true, nut_free: true }, confidence: 0.9, source: "usda_match", photos: 4, ingredients: "red lentils, onion, garlic, cumin, lemon, olive oil, carrot" },
  ],
  Vietnamese: [
    { name: "Pho Bo", desc: "Beef bone broth soup with rice noodles, rare beef, and herbs", price: 14.95, category: "Mains", cal: [420, 520], protein: [28, 36], carbs: [48, 60], fat: [10, 16], flags: { gluten_free: true, dairy_free: true, nut_free: true }, confidence: 0.86, source: "vision_ai", photos: 8, ingredients: "rice noodles, beef broth, rare beef, bean sprouts, Thai basil, lime, hoisin" },
    { name: "Banh Mi", desc: "Vietnamese baguette with lemongrass pork, pickled veggies, and cilantro", price: 10.95, category: "Mains", cal: [480, 560], protein: [22, 28], carbs: [50, 62], fat: [18, 24], flags: { dairy_free: true, nut_free: true }, confidence: 0.84, source: "vision_ai", photos: 7, ingredients: "baguette, lemongrass pork, pickled daikon, carrots, jalapeño, cilantro, pate" },
    { name: "Bun Cha", desc: "Grilled pork patties with rice vermicelli, herbs, and dipping sauce", price: 13.95, category: "Mains", cal: [420, 520], protein: [25, 32], carbs: [45, 55], fat: [14, 20], flags: { gluten_free: true, dairy_free: true, nut_free: true }, confidence: 0.82, source: "vision_ai", photos: 5, ingredients: "pork patties, rice vermicelli, lettuce, herbs, fish sauce, lime" },
    { name: "Goi Cuon", desc: "Fresh summer rolls with shrimp, pork, vermicelli, and peanut sauce", price: 8.95, category: "Appetizers", cal: [200, 260], protein: [12, 16], carbs: [22, 30], fat: [6, 10], flags: { gluten_free: true, dairy_free: true }, confidence: 0.87, source: "vision_ai", photos: 6, ingredients: "rice paper, shrimp, pork, vermicelli, lettuce, mint, peanut sauce" },
    { name: "Vietnamese Coffee", desc: "Strong drip coffee with sweetened condensed milk over ice", price: 5.50, category: "Drinks", cal: [150, 200], protein: [3, 5], carbs: [24, 32], fat: [4, 7], flags: { vegetarian: true, gluten_free: true, nut_free: true }, confidence: 0.92, source: "usda_match", photos: 4, ingredients: "Vietnamese coffee, condensed milk, ice" },
    { name: "Com Tam", desc: "Broken rice with grilled pork chop, egg cake, and fish sauce", price: 13.95, category: "Mains", cal: [580, 700], protein: [30, 38], carbs: [65, 78], fat: [20, 28], flags: { gluten_free: true, dairy_free: true, nut_free: true }, confidence: 0.8, source: "vision_ai", photos: 5, ingredients: "broken rice, grilled pork, egg cake, pickled vegetables, fish sauce" },
  ],
  Korean: [
    { name: "Bibimbap", desc: "Mixed rice bowl with vegetables, egg, bulgogi, and gochujang", price: 14.95, category: "Mains", cal: [520, 640], protein: [25, 32], carbs: [62, 75], fat: [18, 26], flags: { nut_free: true }, confidence: 0.85, source: "vision_ai", photos: 8, ingredients: "rice, beef, spinach, carrots, zucchini, bean sprouts, egg, gochujang" },
    { name: "Korean Fried Chicken", desc: "Double-fried crispy chicken with sweet and spicy sauce", price: 15.95, category: "Mains", cal: [580, 700], protein: [35, 44], carbs: [35, 45], fat: [28, 36], flags: { dairy_free: true, nut_free: true }, confidence: 0.82, source: "vision_ai", photos: 7, ingredients: "chicken, gochujang sauce, garlic, ginger, sesame, rice flour" },
    { name: "Japchae", desc: "Sweet potato glass noodles stir-fried with vegetables and sesame oil", price: 13.95, category: "Mains", cal: [380, 460], protein: [10, 14], carbs: [55, 66], fat: [14, 20], flags: { vegan: true, dairy_free: true }, confidence: 0.84, source: "vision_ai", photos: 5, ingredients: "glass noodles, spinach, carrots, mushrooms, soy sauce, sesame oil" },
    { name: "Kimchi Jjigae", desc: "Spicy fermented kimchi stew with tofu and pork belly", price: 13.95, category: "Soups", cal: [350, 440], protein: [22, 28], carbs: [18, 26], fat: [20, 28], flags: { gluten_free: true, dairy_free: true, nut_free: true }, confidence: 0.8, source: "vision_ai", photos: 5, ingredients: "kimchi, pork belly, tofu, gochugaru, garlic, green onion" },
    { name: "Bulgogi", desc: "Marinated grilled beef with rice and banchan", price: 16.95, category: "Mains", cal: [520, 640], protein: [32, 40], carbs: [50, 62], fat: [18, 26], flags: { dairy_free: true, nut_free: true }, confidence: 0.86, source: "vision_ai", photos: 6, ingredients: "beef, soy sauce, pear, garlic, sesame oil, rice, banchan" },
    { name: "Tteokbokki", desc: "Chewy rice cakes in a spicy sweet gochujang sauce", price: 10.95, category: "Mains", cal: [420, 510], protein: [8, 12], carbs: [78, 92], fat: [8, 14], flags: { vegan: true, dairy_free: true, nut_free: true }, confidence: 0.88, source: "vision_ai", photos: 6, ingredients: "rice cakes, gochujang, sugar, fish cake, green onion" },
    { name: "Mandu (Dumplings)", desc: "Pan-fried pork and vegetable dumplings", price: 9.95, category: "Appetizers", cal: [300, 380], protein: [14, 18], carbs: [28, 36], fat: [14, 20], flags: { dairy_free: true, nut_free: true }, confidence: 0.83, source: "vision_ai", photos: 5, ingredients: "pork, cabbage, tofu, glass noodles, dumpling wrapper, soy sauce" },
  ],
  Chinese: [
    { name: "Kung Pao Chicken", desc: "Spicy diced chicken with peanuts, chili peppers, and vegetables", price: 14.95, category: "Mains", cal: [480, 580], protein: [30, 38], carbs: [25, 35], fat: [26, 34], flags: { dairy_free: true }, confidence: 0.84, source: "vision_ai", photos: 6, ingredients: "chicken, peanuts, dried chilies, bell peppers, soy sauce, vinegar" },
    { name: "Mapo Tofu", desc: "Silky tofu in a fiery Sichuan peppercorn and chili sauce", price: 12.95, category: "Mains", cal: [320, 400], protein: [18, 24], carbs: [12, 18], fat: [22, 30], flags: { dairy_free: true, nut_free: true }, confidence: 0.82, source: "vision_ai", photos: 5, ingredients: "silken tofu, ground pork, doubanjiang, Sichuan pepper, garlic, green onion" },
    { name: "Xiao Long Bao (8)", desc: "Shanghai soup dumplings with pork and ginger", price: 12.95, category: "Appetizers", cal: [380, 460], protein: [20, 26], carbs: [35, 45], fat: [18, 24], flags: { dairy_free: true, nut_free: true }, confidence: 0.8, source: "vision_ai", photos: 8, ingredients: "pork, ginger, dumpling wrapper, rich broth, vinegar, soy sauce" },
    { name: "Bok Choy Stir-Fry", desc: "Baby bok choy sautéed with garlic and oyster sauce", price: 10.95, category: "Sides", cal: [120, 170], protein: [4, 6], carbs: [8, 14], fat: [8, 12], flags: { dairy_free: true, nut_free: true }, confidence: 0.9, source: "usda_match", photos: 4, ingredients: "bok choy, garlic, oyster sauce, sesame oil" },
    { name: "Dan Dan Noodles", desc: "Wheat noodles in a spicy sesame and chili sauce with minced pork", price: 13.95, category: "Mains", cal: [520, 640], protein: [22, 28], carbs: [55, 68], fat: [22, 30], flags: { dairy_free: true }, confidence: 0.82, source: "vision_ai", photos: 5, ingredients: "wheat noodles, sesame paste, chili oil, pork, Sichuan pepper, peanuts" },
    { name: "Egg Drop Soup", desc: "Light chicken broth with silky egg ribbons and green onion", price: 5.95, category: "Soups", cal: [80, 120], protein: [5, 8], carbs: [6, 10], fat: [3, 6], flags: { dairy_free: true, nut_free: true }, confidence: 0.92, source: "usda_match", photos: 3, ingredients: "chicken broth, eggs, cornstarch, green onion, sesame oil" },
    { name: "General Tso's Chicken", desc: "Crispy battered chicken in a sweet and tangy sauce", price: 14.95, category: "Mains", cal: [580, 700], protein: [28, 36], carbs: [48, 60], fat: [28, 38], flags: { dairy_free: true, nut_free: true }, confidence: 0.82, source: "vision_ai", photos: 6, ingredients: "chicken, corn starch, soy sauce, sugar, vinegar, chili, ginger, garlic, broccoli" },
  ],
  French: [
    { name: "Croque Monsieur", desc: "Grilled ham and Gruyère sandwich with béchamel", price: 14.95, category: "Mains", cal: [480, 580], protein: [25, 32], carbs: [30, 40], fat: [28, 36], flags: { nut_free: true }, confidence: 0.84, source: "vision_ai", photos: 5, ingredients: "bread, ham, Gruyère, béchamel, butter, Dijon mustard" },
    { name: "French Onion Soup", desc: "Caramelized onion soup topped with crusty bread and melted Gruyère", price: 11.95, category: "Soups", cal: [320, 400], protein: [12, 16], carbs: [30, 40], fat: [16, 22], flags: { nut_free: true }, confidence: 0.82, source: "vision_ai", photos: 6, ingredients: "onions, beef broth, bread, Gruyère, butter, thyme, white wine" },
    { name: "Salade Niçoise", desc: "Tuna, hard-boiled eggs, olives, green beans, and potatoes", price: 15.95, category: "Salads", cal: [380, 480], protein: [28, 36], carbs: [22, 32], fat: [20, 28], flags: { gluten_free: true, dairy_free: true, nut_free: true }, confidence: 0.86, source: "vision_ai", photos: 5, ingredients: "tuna, eggs, olives, green beans, potatoes, tomatoes, anchovy, vinaigrette" },
    { name: "Duck Confit", desc: "Slow-cooked duck leg with roasted potatoes and greens", price: 24.95, category: "Mains", cal: [580, 720], protein: [32, 40], carbs: [25, 35], fat: [36, 46], flags: { gluten_free: true, dairy_free: true, nut_free: true }, confidence: 0.78, source: "vision_ai", photos: 4, ingredients: "duck leg, duck fat, potatoes, garlic, thyme, greens" },
    { name: "Crème Brûlée", desc: "Classic vanilla custard with caramelized sugar crust", price: 10.95, category: "Desserts", cal: [320, 400], protein: [5, 7], carbs: [30, 40], fat: [20, 28], flags: { vegetarian: true, gluten_free: true, nut_free: true }, confidence: 0.88, source: "vision_ai", photos: 5, ingredients: "cream, egg yolks, sugar, vanilla bean" },
    { name: "Quiche Lorraine", desc: "Savory pastry with bacon, Gruyère, and eggs", price: 12.95, category: "Mains", cal: [420, 520], protein: [18, 24], carbs: [25, 35], fat: [28, 36], flags: { nut_free: true }, confidence: 0.82, source: "vision_ai", photos: 4, ingredients: "pastry, bacon, Gruyère, eggs, cream, onion" },
    { name: "Ratatouille", desc: "Provençal stewed vegetables with herbs", price: 13.95, category: "Mains", cal: [180, 250], protein: [4, 7], carbs: [22, 30], fat: [8, 14], flags: { vegan: true, gluten_free: true, dairy_free: true, nut_free: true }, confidence: 0.9, source: "usda_match", photos: 5, ingredients: "eggplant, zucchini, bell peppers, tomatoes, onion, garlic, herbs de Provence" },
  ],
  Greek: [
    { name: "Chicken Souvlaki Plate", desc: "Grilled chicken skewers with tzatziki, pita, and Greek salad", price: 15.95, category: "Mains", cal: [520, 640], protein: [35, 44], carbs: [35, 45], fat: [22, 30], flags: { nut_free: true }, confidence: 0.85, source: "vision_ai", photos: 7, ingredients: "chicken, tzatziki, pita, tomatoes, cucumber, feta, olives, onion" },
    { name: "Spanakopita", desc: "Crispy phyllo pastry filled with spinach and feta", price: 9.95, category: "Appetizers", cal: [280, 350], protein: [10, 14], carbs: [22, 30], fat: [18, 24], flags: { vegetarian: true, nut_free: true }, confidence: 0.84, source: "vision_ai", photos: 5, ingredients: "phyllo dough, spinach, feta, onion, dill, butter, eggs" },
    { name: "Lamb Gyro", desc: "Slow-roasted lamb in warm pita with tomato, onion, and tzatziki", price: 13.95, category: "Mains", cal: [520, 640], protein: [28, 36], carbs: [38, 48], fat: [26, 34], flags: { nut_free: true }, confidence: 0.82, source: "vision_ai", photos: 6, ingredients: "lamb, pita, tomato, red onion, tzatziki, fries" },
    { name: "Moussaka", desc: "Layered eggplant, ground lamb, and béchamel casserole", price: 16.95, category: "Mains", cal: [480, 600], protein: [22, 30], carbs: [28, 38], fat: [28, 38], flags: { gluten_free: false, nut_free: true }, confidence: 0.8, source: "vision_ai", photos: 4, ingredients: "eggplant, ground lamb, potato, béchamel, tomato sauce, cinnamon" },
    { name: "Avgolemono Soup", desc: "Lemon egg chicken soup with orzo", price: 8.95, category: "Soups", cal: [220, 280], protein: [14, 18], carbs: [20, 28], fat: [8, 14], flags: { nut_free: true, dairy_free: true }, confidence: 0.86, source: "usda_match", photos: 3, ingredients: "chicken broth, eggs, lemon, orzo, chicken" },
    { name: "Loukoumades", desc: "Greek honey donuts with cinnamon and walnuts", price: 8.95, category: "Desserts", cal: [350, 430], protein: [5, 8], carbs: [48, 58], fat: [16, 22], flags: { vegetarian: true }, confidence: 0.82, source: "vision_ai", photos: 4, ingredients: "flour, honey, walnuts, cinnamon, sugar, yeast" },
  ],
};

const REVIEW_PRAISES = ["generous portions", "fresh ingredients", "great flavor", "good value", "authentic taste", "perfectly seasoned", "beautiful presentation"];
const REVIEW_COMPLAINTS = ["can be spicy", "small portion", "slow service", "overpriced", "inconsistent quality"];

async function main() {
  console.log("Seeding NutriScout demo data...");

  // Clear existing data
  await prisma.communityFeedback.deleteMany();
  await prisma.reviewSummary.deleteMany();
  await prisma.dishPhoto.deleteMany();
  await prisma.restaurantDelivery.deleteMany();
  await prisma.restaurantLogistics.deleteMany();
  await prisma.dish.deleteMany();
  await prisma.restaurant.deleteMany();
  await prisma.userProfile.deleteMany();
  console.log("Cleared existing data.");

  // Create demo user
  const user = await prisma.userProfile.create({
    data: {
      email: "demo@nutriscout.app",
      name: "Demo User",
      dietaryRestrictions: { vegan: false, vegetarian: false, gluten_free: false },
      nutritionalGoals: { priority: "max_protein" },
      maxWaitMinutes: 25,
      searchRadiusMiles: 2.0,
      preferredCuisines: ["Thai", "Japanese", "Mediterranean"],
    },
  });
  console.log(`Created demo user: ${user.id}`);

  let totalDishes = 0;

  for (let i = 0; i < RESTAURANTS.length; i++) {
    const r = RESTAURANTS[i];
    const cuisine = r.cuisine[0];
    const templates = DISH_TEMPLATES[cuisine];
    if (!templates) continue;

    const restaurant = await prisma.restaurant.create({
      data: {
        googlePlaceId: `demo_place_${i}`,
        name: r.name,
        address: `${100 + i * 10} ${["1st Ave", "2nd Ave", "Avenue A", "Avenue B", "St Marks Pl", "E 7th St", "E 9th St", "E 6th St"][i % 8]}, New York, NY 10003`,
        latitude: jitter(BASE_LAT),
        longitude: jitter(BASE_LNG),
        cuisineType: r.cuisine,
        priceLevel: r.price,
        googleRating: r.rating,
        yelpRating: r.yelp,
        phone: `212-555-${String(1000 + i).slice(-4)}`,
        websiteUrl: `https://${r.name.toLowerCase().replace(/[^a-z]/g, "")}.example.com`,
        acceptsReservations: r.price >= 3,
        menuSource: "website",
        lastMenuCrawl: new Date(),
        isActive: true,
      },
    });

    // Add delivery options for ~60% of restaurants
    if (Math.random() < 0.6) {
      await prisma.restaurantDelivery.create({
        data: {
          restaurantId: restaurant.id,
          platform: "ubereats",
          isAvailable: true,
          deliveryFeeMin: 1.99,
          deliveryFeeMax: 4.99,
          estimatedDeliveryMinutesMin: 25,
          estimatedDeliveryMinutesMax: 45,
          platformUrl: `https://ubereats.example.com/${restaurant.id}`,
        },
      });
    }
    if (Math.random() < 0.4) {
      await prisma.restaurantDelivery.create({
        data: {
          restaurantId: restaurant.id,
          platform: "doordash",
          isAvailable: true,
          deliveryFeeMin: 2.49,
          deliveryFeeMax: 5.99,
          estimatedDeliveryMinutesMin: 30,
          estimatedDeliveryMinutesMax: 50,
          platformUrl: `https://doordash.example.com/${restaurant.id}`,
        },
      });
    }

    // Add traffic data (current day/hour and a few around it)
    const now = new Date();
    const busynessBase = 30 + Math.floor(Math.random() * 50);
    for (let h = Math.max(0, now.getHours() - 2); h <= Math.min(23, now.getHours() + 2); h++) {
      const busyness = Math.max(10, Math.min(100, busynessBase + (h - now.getHours()) * 10 + Math.floor(Math.random() * 20 - 10)));
      await prisma.restaurantLogistics.create({
        data: {
          restaurantId: restaurant.id,
          dayOfWeek: now.getDay(),
          hour: h,
          typicalBusynessPct: busyness,
          estimatedWaitMinutes: Math.round(busyness * 0.4),
        },
      });
    }

    // Create dishes
    for (const t of templates) {
      const dish = await prisma.dish.create({
        data: {
          restaurantId: restaurant.id,
          name: t.name,
          description: t.desc,
          price: t.price,
          category: t.category,
          ingredientsRaw: t.ingredients,
          ingredientsParsed: t.ingredients.split(", ").map((ing: string) => ({ name: ing, is_primary: true })),
          dietaryFlags: t.flags,
          dietaryConfidence: t.confidence,
          caloriesMin: t.cal[0],
          caloriesMax: t.cal[1],
          proteinMinG: t.protein[0],
          proteinMaxG: t.protein[1],
          carbsMinG: t.carbs[0],
          carbsMaxG: t.carbs[1],
          fatMinG: t.fat[0],
          fatMaxG: t.fat[1],
          macroConfidence: t.confidence,
          macroSource: t.source,
          photoCountAnalyzed: t.photos,
          isAvailable: true,
        },
      });

      // Add photos
      for (let p = 0; p < Math.min(t.photos, 3); p++) {
        await prisma.dishPhoto.create({
          data: {
            dishId: dish.id,
            sourceUrl: `https://images.example.com/${dish.id}_${p}.jpg`,
            sourcePlatform: p === 0 ? "google_maps" : "yelp",
            macroEstimate: {
              calories: Math.round((t.cal[0] + t.cal[1]) / 2 + Math.random() * 40 - 20),
              protein_g: Math.round((t.protein[0] + t.protein[1]) / 2 + Math.random() * 4 - 2),
              carbs_g: Math.round((t.carbs[0] + t.carbs[1]) / 2 + Math.random() * 6 - 3),
              fat_g: Math.round((t.fat[0] + t.fat[1]) / 2 + Math.random() * 4 - 2),
            },
            analyzedAt: new Date(),
          },
        });
      }

      // Add review summary for ~80% of dishes
      if (Math.random() < 0.8) {
        const numPraises = 2 + Math.floor(Math.random() * 2);
        const numComplaints = Math.random() < 0.5 ? 1 : 0;
        const rating = 3.5 + Math.random() * 1.5;

        await prisma.reviewSummary.create({
          data: {
            dishId: dish.id,
            totalReviewsAnalyzed: 10 + Math.floor(Math.random() * 40),
            googleReviewCount: 5 + Math.floor(Math.random() * 20),
            yelpReviewCount: 3 + Math.floor(Math.random() * 15),
            averageDishRating: parseFloat(rating.toFixed(2)),
            summaryText: `${t.name} is well-regarded for its ${t.ingredients.split(", ").slice(0, 2).join(" and ")}. Diners appreciate the quality and preparation.`,
            sentimentPositivePct: 70 + Math.random() * 20,
            sentimentNegativePct: 5 + Math.random() * 15,
            commonPraises: shuffle(REVIEW_PRAISES).slice(0, numPraises),
            commonComplaints: shuffle(REVIEW_COMPLAINTS).slice(0, numComplaints),
            dietaryWarnings: [],
          },
        });
      }

      totalDishes++;
    }

    console.log(`  ${restaurant.name}: ${templates.length} dishes created`);
  }

  console.log(`\nDone! Created ${RESTAURANTS.length} restaurants with ${totalDishes} total dishes.`);
  console.log(`Demo user login: demo@nutriscout.app`);
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
