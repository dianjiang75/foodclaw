"use client";

import { useState } from "react";
import { X, Plus, SlidersHorizontal } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// Basic dietary types
const DIETARY_TYPES = [
  { id: "vegan", label: "Vegan" },
  { id: "vegetarian", label: "Vegetarian" },
  { id: "pescatarian", label: "Pescatarian" },
  { id: "keto", label: "Keto" },
  { id: "paleo", label: "Paleo" },
  { id: "halal", label: "Halal" },
  { id: "kosher", label: "Kosher" },
] as const;

// FDA Big 9 + additional common allergens
const ALLERGENS = [
  // FDA Big 9
  { id: "milk", label: "Milk", group: "FDA Big 9" },
  { id: "eggs", label: "Eggs", group: "FDA Big 9" },
  { id: "peanuts", label: "Peanuts", group: "FDA Big 9" },
  { id: "tree_nuts", label: "Tree Nuts", group: "FDA Big 9" },
  { id: "fish", label: "Fish", group: "FDA Big 9" },
  { id: "shellfish", label: "Shellfish", group: "FDA Big 9" },
  { id: "wheat", label: "Wheat", group: "FDA Big 9" },
  { id: "soybeans", label: "Soybeans", group: "FDA Big 9" },
  { id: "sesame", label: "Sesame", group: "FDA Big 9" },
  // Additional common (EU 14 extras)
  { id: "celery", label: "Celery", group: "Other Common" },
  { id: "mustard", label: "Mustard", group: "Other Common" },
  { id: "lupin", label: "Lupin", group: "Other Common" },
  { id: "molluscs", label: "Molluscs", group: "Other Common" },
  { id: "sulphites", label: "Sulphites", group: "Other Common" },
  { id: "gluten", label: "Gluten", group: "Other Common" },
] as const;

export interface FilterState {
  diets: string[];
  allergens: string[];
  customRestrictions: string[];
}

interface FilterDrawerProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

export function FilterDrawer({ filters, onChange }: FilterDrawerProps) {
  const [customInput, setCustomInput] = useState("");
  const activeCount =
    filters.diets.length + filters.allergens.length + filters.customRestrictions.length;

  function toggleDiet(id: string) {
    onChange({
      ...filters,
      diets: filters.diets.includes(id)
        ? filters.diets.filter((d) => d !== id)
        : [...filters.diets, id],
    });
  }

  function toggleAllergen(id: string) {
    onChange({
      ...filters,
      allergens: filters.allergens.includes(id)
        ? filters.allergens.filter((a) => a !== id)
        : [...filters.allergens, id],
    });
  }

  function addCustom() {
    const trimmed = customInput.trim().toLowerCase();
    if (trimmed && !filters.customRestrictions.includes(trimmed)) {
      onChange({
        ...filters,
        customRestrictions: [...filters.customRestrictions, trimmed],
      });
      setCustomInput("");
    }
  }

  function removeCustom(item: string) {
    onChange({
      ...filters,
      customRestrictions: filters.customRestrictions.filter((c) => c !== item),
    });
  }

  function clearAll() {
    onChange({ diets: [], allergens: [], customRestrictions: [] });
  }

  const fdaBig9 = ALLERGENS.filter((a) => a.group === "FDA Big 9");
  const otherAllergens = ALLERGENS.filter((a) => a.group === "Other Common");

  return (
    <Sheet>
      <SheetTrigger
        className="relative flex items-center justify-center w-9 h-9 rounded-full border border-border hover:bg-muted transition-colors shrink-0"
      >
        <SlidersHorizontal className="w-4 h-4 text-foreground" />
        {activeCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-ns-green text-white text-[9px] font-bold flex items-center justify-center">
            {activeCount}
          </span>
        )}
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="flex flex-row items-center justify-between pr-2">
          <SheetTitle>Filters</SheetTitle>
          {activeCount > 0 && (
            <button onClick={clearAll} className="text-xs text-muted-foreground hover:text-foreground">
              Clear all
            </button>
          )}
        </SheetHeader>

        <div className="space-y-5 mt-4 pb-6">
          {/* Section 1: Dietary Types */}
          <section>
            <h3 className="text-sm font-semibold mb-2.5">Dietary Preferences</h3>
            <div className="flex flex-wrap gap-2">
              {DIETARY_TYPES.map((diet) => {
                const isActive = filters.diets.includes(diet.id);
                return (
                  <button
                    key={diet.id}
                    onClick={() => toggleDiet(diet.id)}
                    className={`text-xs font-medium px-3.5 py-2 rounded-full border transition-all duration-200 ${
                      isActive
                        ? "bg-primary text-primary-foreground border-primary shadow-sm scale-[1.02]"
                        : "border-border/70 text-muted-foreground hover:bg-primary/10 hover:border-primary/30 hover:text-primary"
                    }`}
                  >
                    {diet.label}
                  </button>
                );
              })}
            </div>
          </section>

          <Separator />

          {/* Section 2: Allergens */}
          <section>
            <h3 className="text-sm font-semibold mb-1">Allergen Exclusions</h3>
            <p className="text-xs text-muted-foreground mb-2.5">
              Dishes containing these will be excluded
            </p>

            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">FDA Big 9</p>
                <div className="flex flex-wrap gap-2">
                  {fdaBig9.map((allergen) => {
                    const isActive = filters.allergens.includes(allergen.id);
                    return (
                      <button
                        key={allergen.id}
                        onClick={() => toggleAllergen(allergen.id)}
                        className={`text-xs font-medium px-3.5 py-2 rounded-full border transition-all duration-200 ${
                          isActive
                            ? "bg-ns-red text-white border-ns-red shadow-sm scale-[1.02]"
                            : "border-border/70 text-muted-foreground hover:bg-ns-red-light hover:border-ns-red/30 hover:text-ns-red"
                        }`}
                      >
                        {allergen.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Other Common</p>
                <div className="flex flex-wrap gap-2">
                  {otherAllergens.map((allergen) => {
                    const isActive = filters.allergens.includes(allergen.id);
                    return (
                      <button
                        key={allergen.id}
                        onClick={() => toggleAllergen(allergen.id)}
                        className={`text-xs font-medium px-3.5 py-2 rounded-full border transition-all duration-200 ${
                          isActive
                            ? "bg-ns-red text-white border-ns-red shadow-sm scale-[1.02]"
                            : "border-border/70 text-muted-foreground hover:bg-ns-red-light hover:border-ns-red/30 hover:text-ns-red"
                        }`}
                      >
                        {allergen.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <Separator />

          {/* Section 3: Custom */}
          <section>
            <h3 className="text-sm font-semibold mb-1">Other Restrictions</h3>
            <p className="text-xs text-muted-foreground mb-2.5">
              Add any custom dietary needs
            </p>
            <div className="flex gap-2">
              <Input
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="e.g. nightshades, FODMAPs..."
                className="h-8 text-sm"
                onKeyDown={(e) => e.key === "Enter" && addCustom()}
              />
              <Button size="sm" variant="outline" className="h-8 px-2 shrink-0" onClick={addCustom}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {filters.customRestrictions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {filters.customRestrictions.map((item) => (
                  <Badge key={item} variant="secondary" className="text-xs gap-1 pr-1">
                    {item}
                    <button onClick={() => removeCustom(item)} className="hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="sticky bottom-0 bg-background pt-2 pb-4 border-t">
          <SheetClose
            className="w-full inline-flex items-center justify-center rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground h-11 px-4 text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md"
          >
            Apply Filters {activeCount > 0 && `(${activeCount})`}
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}
