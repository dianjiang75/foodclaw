"use client";

import Link from "next/link";
import { Icon } from "@iconify/react";

const CATEGORIES = [
  { id: "thai", label: "Thai", icon: "tabler:bowl-chopsticks" },
  { id: "japanese", label: "Japanese", icon: "lucide-lab:sushi-chopsticks" },
  { id: "italian", label: "Italian", icon: "lucide:pizza" },
  { id: "mexican", label: "Mexican", icon: "hugeicons:taco-01" },
  { id: "indian", label: "Indian", icon: "mingcute:pot-line" },
  { id: "chinese", label: "Chinese", icon: "mingcute:chopsticks-line" },
  { id: "korean", label: "Korean", icon: "mingcute:bowl-line" },
  { id: "mediterranean", label: "Mediterranean", icon: "lucide:leaf" },
  { id: "american", label: "American", icon: "tabler:burger" },
  { id: "vietnamese", label: "Vietnamese", icon: "hugeicons:noodles" },
  { id: "lunch", label: "Lunch", icon: "solar:plate-outline" },
  { id: "dinner", label: "Dinner", icon: "lucide:fork-knife" },
  { id: "breakfast", label: "Breakfast", icon: "lucide:coffee" },
  { id: "pizza", label: "Pizza", icon: "tabler:pizza" },
  { id: "sushi", label: "Sushi", icon: "tabler:fish" },
  { id: "bowls", label: "Bowls", icon: "mingcute:bowl-2-line" },
  { id: "salads", label: "Salads", icon: "lucide:salad" },
  { id: "sandwiches", label: "Sandwiches", icon: "lucide:sandwich" },
  { id: "burgers", label: "Burgers", icon: "hugeicons:steak" },
  { id: "noodles", label: "Noodles", icon: "hugeicons:noodles" },
  { id: "soup", label: "Soup", icon: "tabler:soup" },
  { id: "tacos", label: "Tacos", icon: "hugeicons:taco-02" },
] as const;

export function CategoryPills() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-1 no-scrollbar -mx-4 px-4">
      {CATEGORIES.map((cat) => (
        <Link
          key={cat.id}
          href={`/category/${cat.id}`}
          className="flex flex-col items-center gap-1.5 shrink-0 group"
        >
          <div className="w-14 h-14 rounded-2xl bg-card border border-border/50 flex items-center justify-center transition-all duration-200 group-hover:scale-105 group-hover:shadow-md group-hover:border-primary/30 group-active:scale-95">
            <Icon icon={cat.icon} width={26} height={26} className="text-foreground/70 group-hover:text-primary transition-colors" />
          </div>
          <span className="text-[10px] font-medium text-muted-foreground group-hover:text-foreground transition-colors whitespace-nowrap">
            {cat.label}
          </span>
        </Link>
      ))}
    </div>
  );
}

export { CATEGORIES };
