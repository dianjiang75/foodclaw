import { search } from "@/lib/orchestrator";
import type { DietaryFlags } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const lat = parseFloat(searchParams.get("lat") || "");
    const lng = parseFloat(searchParams.get("lng") || "");

    if (isNaN(lat) || isNaN(lng)) {
      return Response.json({ error: "lat and lng are required" }, { status: 400 });
    }

    const dietStr = searchParams.get("diet") || "";
    const dietaryRestrictions: DietaryFlags = {
      vegan: dietStr.includes("vegan") ? true : null,
      vegetarian: dietStr.includes("vegetarian") ? true : null,
      gluten_free: dietStr.includes("gluten_free") ? true : null,
      halal: dietStr.includes("halal") ? true : null,
      kosher: dietStr.includes("kosher") ? true : null,
      dairy_free: dietStr.includes("dairy_free") ? true : null,
      nut_free: dietStr.includes("nut_free") ? true : null,
      pescatarian: dietStr.includes("pescatarian") ? true : null,
      keto: dietStr.includes("keto") ? true : null,
      paleo: dietStr.includes("paleo") ? true : null,
    };

    const results = await search({
      latitude: lat,
      longitude: lng,
      radius_miles: parseFloat(searchParams.get("radius") || "2"),
      dietary_restrictions: dietaryRestrictions,
      nutritional_goal: (searchParams.get("goal") as "max_protein" | "min_calories" | "min_fat" | "min_carbs" | "balanced") || undefined,
      calorie_limit: searchParams.get("calorie_limit") ? parseInt(searchParams.get("calorie_limit")!) : undefined,
      protein_min_g: searchParams.get("protein_min") ? parseInt(searchParams.get("protein_min")!) : undefined,
      cuisine_preferences: searchParams.get("cuisines")?.split(",").filter(Boolean) || undefined,
      max_wait_minutes: searchParams.get("max_wait") ? parseInt(searchParams.get("max_wait")!) : undefined,
      include_delivery: searchParams.get("delivery") === "true",
      sort_by: (searchParams.get("sort") as "macro_match" | "distance" | "rating" | "wait_time") || undefined,
      limit: parseInt(searchParams.get("limit") || "20"),
      offset: parseInt(searchParams.get("offset") || "0"),
      query: searchParams.get("q") || undefined,
      categories: searchParams.get("categories")?.split(",").filter(Boolean) || undefined,
      allergens: searchParams.get("allergens")?.split(",").filter(Boolean) || undefined,
    });

    return Response.json(results);
  } catch (error) {
    console.error("Search error:", error);
    return Response.json({ error: "Search failed" }, { status: 500 });
  }
}
