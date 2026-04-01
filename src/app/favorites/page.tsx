"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heart } from "lucide-react";
import { DishCard, type DishCardData } from "@/components/dish-card";
import { useAuth } from "@/lib/auth/context";
import { Skeleton } from "@/components/ui/skeleton";

export default function FavoritesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [dishes, setDishes] = useState<DishCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    fetch("/api/favorites")
      .then((r) => (r.ok ? r.json() : { favorites: [] }))
      .then((data) => {
        const mapped: DishCardData[] = (data.favorites || []).map((f: Record<string, unknown>) => ({
          id: f.id as string,
          name: f.name as string,
          restaurant_name: f.restaurant_name as string,
          photo_url: f.photo_url as string | null,
          macros: {
            calories: f.calories_min != null ? { min: f.calories_min as number, max: f.calories_min as number } : null,
            protein_g: f.protein_max_g != null ? { min: f.protein_max_g as number, max: f.protein_max_g as number } : null,
            carbs_g: null,
            fat_g: null,
          },
          macro_confidence: null,
          macro_source: null,
          rating: null,
        }));
        setDishes(mapped);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, router]);

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Favorites</h1>
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          Home
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="aspect-[3/2] rounded-2xl" />
          ))}
        </div>
      ) : dishes.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Heart className="w-12 h-12 mx-auto text-muted-foreground/30" />
          <p className="text-muted-foreground text-sm">No favorites yet</p>
          <p className="text-muted-foreground/60 text-xs">
            Tap the heart on any dish to save it here
          </p>
          <Link href="/" className="inline-block mt-2 text-sm text-primary font-medium hover:underline">
            Browse dishes
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {dishes.map((dish) => (
            <DishCard key={dish.id} dish={dish} initialFavorited />
          ))}
        </div>
      )}
    </div>
  );
}
