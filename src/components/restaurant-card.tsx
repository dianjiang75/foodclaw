"use client";

import Link from "next/link";
import { Star, MapPin, Clock, ChevronRight } from "lucide-react";

export interface RestaurantCardData {
  id: string;
  name: string;
  address: string;
  cuisineType: string[];
  googleRating: number | null;
  distanceMiles: number | null;
  topDishes: {
    id: string;
    name: string;
    calories_min: number | null;
    calories_max: number | null;
    protein_min_g: number | null;
    protein_max_g: number | null;
  }[];
  estimatedWait: number | null;
}

export function RestaurantCard({ restaurant }: { restaurant: RestaurantCardData }) {
  return (
    <Link href={`/restaurant/${restaurant.id}`} className="group block">
      <div className="rounded-2xl overflow-hidden bg-card border border-border/50 p-4 transition-all duration-300 group-hover:shadow-lg group-hover:-translate-y-0.5 group-active:translate-y-0">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-sm group-hover:text-primary transition-colors">{restaurant.name}</h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {restaurant.googleRating != null && (
                <span className="flex items-center gap-0.5 text-xs font-semibold">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  {restaurant.googleRating.toFixed(1)}
                </span>
              )}
              {restaurant.distanceMiles != null && (
                <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  {restaurant.distanceMiles.toFixed(1)} mi
                </span>
              )}
              {restaurant.estimatedWait != null && (
                <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {restaurant.estimatedWait} min
                </span>
              )}
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground/50 mt-1 group-hover:text-primary transition-colors" />
        </div>

        {/* Cuisine tags */}
        <div className="flex gap-1.5 mt-2.5 flex-wrap">
          {restaurant.cuisineType.slice(0, 3).map((c) => (
            <span key={c} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/8 text-primary border border-primary/15">
              {c}
            </span>
          ))}
        </div>

        {/* Top dishes */}
        {restaurant.topDishes.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
              Top Dishes
            </p>
            <div className="space-y-1">
              {restaurant.topDishes.slice(0, 3).map((dish) => (
                <div key={dish.id} className="flex items-center justify-between text-xs">
                  <span className="truncate mr-2 text-foreground/80">{dish.name}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                    {dish.calories_min != null
                      ? `${dish.calories_min}${dish.calories_max && dish.calories_max !== dish.calories_min ? `–${dish.calories_max}` : ""} cal`
                      : ""}
                    {dish.protein_min_g != null ? ` · ${dish.protein_min_g}g P` : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
