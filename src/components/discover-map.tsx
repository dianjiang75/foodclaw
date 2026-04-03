"use client";

import { useCallback, useRef, useState } from "react";
import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";
import { Star, Utensils } from "lucide-react";

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

interface DiscoverMapProps {
  onRestaurantSelect: (restaurant: Restaurant | null) => void;
  selectedId: string | null;
  cuisineFilter?: string[];
  maxWaitFilter?: number;
}

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "";
const DEFAULT_CENTER = { lat: 40.7128, lng: -74.006 }; // NYC
const DEFAULT_ZOOM = 14;

export default function DiscoverMap({
  onRestaurantSelect,
  selectedId,
  cuisineFilter,
  maxWaitFilter,
}: DiscoverMapProps) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const abortRef = useRef<AbortController>(undefined);

  // Request user location once
  const requestLocation = useCallback(() => {
    if (userLocation || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    );
  }, [userLocation]);

  const fetchViewportBounds = useCallback(
    (bounds: { neLat: number; neLng: number; swLat: number; swLng: number }) => {
      // Debounce 300ms
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setLoading(true);
        try {
          const params = new URLSearchParams({
            neLat: String(bounds.neLat),
            neLng: String(bounds.neLng),
            swLat: String(bounds.swLat),
            swLng: String(bounds.swLng),
          });

          if (cuisineFilter?.length) params.set("cuisines", cuisineFilter.join(","));
          if (maxWaitFilter) params.set("maxWait", String(maxWaitFilter));
          if (userLocation) {
            params.set("userLat", String(userLocation.lat));
            params.set("userLng", String(userLocation.lng));
          }

          const res = await fetch(`/api/discover/viewport?${params}`, {
            signal: controller.signal,
          });
          if (res.ok) {
            const json = await res.json();
            setRestaurants(json.data?.restaurants ?? []);
          }
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") return;
        } finally {
          setLoading(false);
        }
      }, 300);
    },
    [cuisineFilter, maxWaitFilter, userLocation]
  );

  return (
    <APIProvider apiKey={API_KEY}>
      <Map
        defaultCenter={userLocation ?? DEFAULT_CENTER}
        defaultZoom={DEFAULT_ZOOM}
        mapId="foodclaw-discover"
        gestureHandling="greedy"
        disableDefaultUI
        className="w-full h-full"
        onBoundsChanged={(e) => {
          requestLocation();
          if (e.detail.bounds) {
            const b = e.detail.bounds;
            fetchViewportBounds({
              neLat: b.north,
              neLng: b.east,
              swLat: b.south,
              swLng: b.west,
            });
          }
        }}
      >
        {/* User location marker */}
        {userLocation && (
          <AdvancedMarker position={userLocation}>
            <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-lg animate-pulse" />
          </AdvancedMarker>
        )}

        {/* Restaurant markers */}
        {restaurants.map((r) => (
          <AdvancedMarker
            key={r.id}
            position={{ lat: r.latitude, lng: r.longitude }}
            onClick={() => onRestaurantSelect(r)}
          >
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded-full shadow-md text-xs font-medium transition-all ${
                selectedId === r.id
                  ? "bg-primary text-primary-foreground scale-110"
                  : "bg-white text-gray-800 hover:scale-105"
              }`}
            >
              <Utensils className="w-3 h-3" />
              <span>{r.dish_count}</span>
              {r.google_rating && (
                <>
                  <Star className="w-3 h-3 text-yellow-500 ml-0.5" />
                  <span>{r.google_rating.toFixed(1)}</span>
                </>
              )}
            </div>
          </AdvancedMarker>
        ))}
      </Map>

      {loading && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-background/90 backdrop-blur-sm border border-border/40 text-xs text-muted-foreground shadow-sm">
          Loading restaurants...
        </div>
      )}
    </APIProvider>
  );
}
