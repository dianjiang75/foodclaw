"use client";

import { UtensilsCrossed, Store, ChefHat, Lock } from "lucide-react";

export type NavTab = "dishes" | "restaurants" | "cook";

interface BottomNavProps {
  active: NavTab;
  onChange: (tab: NavTab) => void;
}

const tabs = [
  { id: "dishes" as const, label: "Dishes", icon: UtensilsCrossed },
  { id: "restaurants" as const, label: "Restaurants", icon: Store },
  { id: "cook" as const, label: "Cook It Myself", icon: ChefHat, locked: true },
];

export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t safe-area-bottom">
      <div className="max-w-2xl mx-auto flex">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.id;
          const isLocked = tab.locked;

          return (
            <button
              key={tab.id}
              onClick={() => !isLocked && onChange(tab.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 pt-2.5 transition-colors relative ${
                isLocked
                  ? "opacity-40 cursor-not-allowed"
                  : isActive
                  ? "text-ns-green"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {isLocked && (
                  <Lock className="w-2.5 h-2.5 absolute -top-1 -right-2" />
                )}
              </div>
              <span className="text-[10px] font-medium">{tab.label}</span>
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-ns-green rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
