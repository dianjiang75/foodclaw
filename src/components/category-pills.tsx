"use client";

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

interface CategoryPillsProps {
  selected: string[];
  onToggle: (id: string) => void;
}

export function CategoryPills({ selected, onToggle }: CategoryPillsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
      {CATEGORIES.map((cat) => {
        const isActive = selected.includes(cat.id);
        return (
          <button
            key={cat.id}
            onClick={() => onToggle(cat.id)}
            className={`text-xs px-3 py-1.5 rounded-full border whitespace-nowrap shrink-0 transition-colors ${
              isActive
                ? "bg-ns-green text-white border-ns-green"
                : "border-border hover:bg-muted text-foreground"
            }`}
          >
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}

export { CATEGORIES };
