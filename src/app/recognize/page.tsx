"use client";

import { useState, useCallback } from "react";
import { ArrowLeft, Loader2, ScanLine } from "lucide-react";
import Link from "next/link";
import { PhotoUpload } from "@/components/photo-upload";
import { RecognitionResults } from "@/components/recognition-results";

interface RecognitionResponse {
  success: boolean;
  data?: {
    recognition: {
      dish_name: string;
      cuisine_type: string;
      confidence: number;
      preparation_method: string;
      macros: {
        calories: { min: number; max: number; best_estimate: number };
        protein_g: { min: number; max: number; best_estimate: number };
        carbs_g: { min: number; max: number; best_estimate: number };
        fat_g: { min: number; max: number; best_estimate: number };
      };
      ingredients: { name: string; estimated_grams: number; is_primary: boolean }[];
    };
    db_matches: {
      id: string;
      name: string;
      similarity_score: number;
      restaurant_name: string;
      distance_miles: number | null;
      calories_min: number | null;
      calories_max: number | null;
      photo_url: string | null;
    }[];
  };
  error?: string;
}

type AnalysisState =
  | { status: "idle" }
  | { status: "analyzing" }
  | { status: "done"; data: NonNullable<RecognitionResponse["data"]> }
  | { status: "error"; message: string };

export default function RecognizePage() {
  const [state, setState] = useState<AnalysisState>({ status: "idle" });
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Request geolocation once on first interaction
  const requestLocation = useCallback(() => {
    if (userLocation || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {} // Location denied — still works without it
    );
  }, [userLocation]);

  const handleFileSelected = useCallback(
    async (file: File) => {
      requestLocation();
      setState({ status: "analyzing" });

      try {
        const formData = new FormData();
        formData.append("photo", file);
        if (userLocation) {
          formData.append("lat", String(userLocation.lat));
          formData.append("lng", String(userLocation.lng));
          formData.append("radius", "3");
        }

        const res = await fetch("/api/recognize", {
          method: "POST",
          body: formData,
        });

        const json: RecognitionResponse = await res.json();

        if (!res.ok || !json.success || !json.data) {
          setState({ status: "error", message: json.error || `Analysis failed (${res.status})` });
          return;
        }

        setState({ status: "done", data: json.data });
      } catch {
        setState({ status: "error", message: "Network error. Please try again." });
      }
    },
    [userLocation, requestLocation]
  );

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border/40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Link
            href="/"
            className="p-2 -ml-2 rounded-lg hover:bg-accent transition-colors min-h-[44px] flex items-center"
            aria-label="Back to home"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-primary" />
            <h1 className="font-semibold">Scan Food</h1>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Upload area */}
        <PhotoUpload
          onFileSelected={handleFileSelected}
          disabled={state.status === "analyzing"}
        />

        {/* Analyzing state */}
        {state.status === "analyzing" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <div className="text-center">
              <p className="text-sm font-medium">Analyzing your food...</p>
              <p className="text-xs text-muted-foreground mt-1">
                Identifying dish, estimating macros, finding nearby matches
              </p>
            </div>
          </div>
        )}

        {/* Error state */}
        {state.status === "error" && (
          <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 p-4 text-center">
            <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>
            <button
              onClick={() => setState({ status: "idle" })}
              className="mt-3 text-xs text-primary font-medium hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Results */}
        {state.status === "done" && (
          <RecognitionResults
            recognition={state.data.recognition}
            dbMatches={state.data.db_matches}
          />
        )}

        {/* Hint text when idle */}
        {state.status === "idle" && (
          <div className="text-center text-sm text-muted-foreground space-y-1.5 py-4">
            <p>Take a photo of any dish to instantly get:</p>
            <ul className="space-y-1">
              <li>Dish identification with AI confidence</li>
              <li>Estimated calories, protein, carbs, and fat</li>
              <li>Matching dishes at nearby restaurants</li>
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}
