"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ArrowLeft, MapPin } from "lucide-react";
import Link from "next/link";
import { RestaurantInfoPanel } from "@/components/restaurant-info-panel";

// Dynamic import — Google Maps SDK requires window, cannot SSR
const DiscoverMap = dynamic(() => import("@/components/discover-map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-muted animate-pulse flex items-center justify-center">
      <MapPin className="w-8 h-8 text-muted-foreground/50" />
    </div>
  ),
});

interface Restaurant {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  cuisine_type: string[];
  google_rating: number | null;
  dish_count: number;
  estimated_wait_minutes: number | null;
  distance_miles: number | null;
  walk_minutes: number | null;
  drive_minutes: number | null;
  top_dishes: { id: string; name: string; calories_avg: number | null }[];
}

export default function DiscoverPage() {
  const [selected, setSelected] = useState<Restaurant | null>(null);

  return (
    <main className="h-dvh flex flex-col bg-background">
      {/* Header */}
      <header className="shrink-0 bg-background/80 backdrop-blur-md border-b border-border/40 z-20">
        <div className="max-w-screen-xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link
            href="/"
            className="p-2 -ml-2 rounded-lg hover:bg-accent transition-colors min-h-[44px] flex items-center"
            aria-label="Back to home"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            <h1 className="font-semibold">Discover Nearby</h1>
          </div>
        </div>
      </header>

      {/* Map fills remaining space */}
      <div className="flex-1 relative">
        <DiscoverMap
          onRestaurantSelect={setSelected}
          selectedId={selected?.id ?? null}
        />

        {/* Restaurant info panel */}
        {selected && (
          <RestaurantInfoPanel
            restaurant={selected}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
    </main>
  );
}
