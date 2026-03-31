"use client";

import Link from "next/link";

const CATEGORIES = [
  // Cuisine types
  { id: "thai", label: "Thai", type: "cuisine" },
  { id: "japanese", label: "Japanese", type: "cuisine" },
  { id: "italian", label: "Italian", type: "cuisine" },
  { id: "mexican", label: "Mexican", type: "cuisine" },
  { id: "indian", label: "Indian", type: "cuisine" },
  { id: "chinese", label: "Chinese", type: "cuisine" },
  { id: "korean", label: "Korean", type: "cuisine" },
  { id: "mediterranean", label: "Mediterranean", type: "cuisine" },
  { id: "american", label: "American", type: "cuisine" },
  { id: "vietnamese", label: "Vietnamese", type: "cuisine" },
  // Meal / dish categories
  { id: "lunch", label: "Lunch", type: "meal" },
  { id: "dinner", label: "Dinner", type: "meal" },
  { id: "breakfast", label: "Breakfast", type: "meal" },
  { id: "pizza", label: "Pizza", type: "meal" },
  { id: "sushi", label: "Sushi", type: "meal" },
  { id: "bowls", label: "Bowls", type: "meal" },
  { id: "salads", label: "Salads", type: "meal" },
  { id: "sandwiches", label: "Sandwiches", type: "meal" },
  { id: "burgers", label: "Burgers", type: "meal" },
  { id: "noodles", label: "Noodles", type: "meal" },
  { id: "soup", label: "Soup", type: "meal" },
  { id: "tacos", label: "Tacos", type: "meal" },
] as const;

const EMOJI_MAP: Record<string, string> = {
  thai: "🇹🇭", japanese: "🇯🇵", italian: "🇮🇹", mexican: "🇲🇽", indian: "🇮🇳",
  chinese: "🇨🇳", korean: "🇰🇷", mediterranean: "🫒", american: "🇺🇸", vietnamese: "🇻🇳",
  lunch: "🍱", dinner: "🍽️", breakfast: "🥞", pizza: "🍕", sushi: "🍣",
  bowls: "🥗", salads: "🥬", sandwiches: "🥪", burgers: "🍔", noodles: "🍜",
  soup: "🍲", tacos: "🌮",
};

export function CategoryPills() {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar -mx-4 px-4">
      {CATEGORIES.map((cat) => (
        <Link
          key={cat.id}
          href={`/category/${cat.id}`}
          className="text-[11px] font-semibold px-3 py-1.5 rounded-full whitespace-nowrap shrink-0 transition-all duration-200 bg-muted/50 hover:bg-primary/10 hover:text-primary text-muted-foreground flex items-center gap-1"
        >
          <span className="text-xs">{EMOJI_MAP[cat.id] || ""}</span>
          {cat.label}
        </Link>
      ))}
    </div>
  );
}

export { CATEGORIES };
