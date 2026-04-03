"use client";

import { X, Star, Clock, Navigation, Footprints, Car } from "lucide-react";
import Link from "next/link";

interface Restaurant {
  id: string;
  name: string;
  cuisine_type: string[];
  google_rating: number | null;
  dish_count: number;
  estimated_wait_minutes: number | null;
  distance_miles: number | null;
  walk_minutes: number | null;
  drive_minutes: number | null;
  top_dishes: { id: string; name: string; calories_avg: number | null }[];
}

interface RestaurantInfoPanelProps {
  restaurant: Restaurant;
  onClose: () => void;
}

export function RestaurantInfoPanel({ restaurant, onClose }: RestaurantInfoPanelProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl border-t border-border/40 shadow-2xl animate-in slide-in-from-bottom-5 duration-200 z-10 max-h-[60vh] overflow-y-auto">
      {/* Drag handle */}
      <div className="flex justify-center pt-2 pb-1">
        <div className="w-10 h-1 rounded-full bg-muted" />
      </div>

      <div className="px-4 pb-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{restaurant.name}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {restaurant.cuisine_type.map((c) => (
                <span key={c} className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                  {c}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-accent transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 text-sm">
          {restaurant.google_rating && (
            <span className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-500" />
              {restaurant.google_rating.toFixed(1)}
            </span>
          )}
          <span className="flex items-center gap-1 text-muted-foreground">
            <Navigation className="w-4 h-4" />
            {restaurant.dish_count} dishes
          </span>
          {restaurant.estimated_wait_minutes != null && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <Clock className="w-4 h-4" />
              ~{restaurant.estimated_wait_minutes} min wait
            </span>
          )}
        </div>

        {/* Travel time */}
        {(restaurant.walk_minutes != null || restaurant.drive_minutes != null) && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {restaurant.distance_miles != null && (
              <span>{restaurant.distance_miles} mi away</span>
            )}
            {restaurant.walk_minutes != null && (
              <span className="flex items-center gap-1">
                <Footprints className="w-4 h-4" />
                {restaurant.walk_minutes} min walk
              </span>
            )}
            {restaurant.drive_minutes != null && (
              <span className="flex items-center gap-1">
                <Car className="w-4 h-4" />
                {restaurant.drive_minutes} min drive
              </span>
            )}
          </div>
        )}

        {/* Top dishes */}
        {restaurant.top_dishes.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Top Dishes</h3>
            {restaurant.top_dishes.map((dish) => (
              <Link
                key={dish.id}
                href={`/dish/${dish.id}`}
                className="flex items-center justify-between p-3 rounded-xl border border-border/40 hover:bg-accent transition-colors"
              >
                <span className="text-sm font-medium">{dish.name}</span>
                {dish.calories_avg && (
                  <span className="text-xs text-muted-foreground font-mono">
                    ~{dish.calories_avg} cal
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}

        {/* View full menu */}
        <Link
          href={`/restaurant/${restaurant.id}`}
          className="block w-full text-center py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:brightness-110 transition-all min-h-[44px]"
        >
          View Full Menu
        </Link>
      </div>
    </div>
  );
}
