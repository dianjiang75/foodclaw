import type { DietaryFlags } from "@/types";
import type { DishResult } from "@/lib/orchestrator/types";

// ─── Configurable Safety Thresholds ─────────────────────
// These can be tuned based on user feedback and regulatory requirements.

/** Confidence thresholds for dietary safety decisions */
const THRESHOLDS = {
  /** Min confidence to keep a dish with unknown dietary flag */
  UNKNOWN_FLAG_MIN: 0.7,
  /** Min confidence for allergy-critical restrictions (e.g., nut_free) */
  ALLERGY_CRITICAL_MIN: 0.85,
  /** Below this confidence, add a "not verified" warning even if flag is true */
  WARNING_THRESHOLD: 0.9,
} as const;

/**
 * Allergy-critical restrictions that need stricter filtering.
 * These are FDA Big 9 allergens where a false positive could cause
 * anaphylaxis. Requires explicit `true` flag + high confidence.
 * Add new entries here instead of modifying the verify() function.
 */
const ALLERGY_CRITICAL: (keyof DietaryFlags)[] = [
  "nut_free",
  "gluten_free",
  "dairy_free",  // lactose intolerance + casein allergy
];

/**
 * Allergen-to-dietary-flag mapping.
 * Maps FDA Big 9 allergens to the dietary flags that would exclude them.
 * If a user excludes "peanuts", we check for nut_free flag on the dish.
 */
const ALLERGEN_TO_FLAG: Record<string, keyof DietaryFlags> = {
  peanuts: "nut_free",
  tree_nuts: "nut_free",
  wheat: "gluten_free",
  gluten: "gluten_free",
  milk: "dairy_free",
  eggs: "dairy_free",
  // These allergens don't map to a dietary flag — filtered by description keyword matching
  // fish, shellfish, soybeans, sesame, celery, mustard, lupin, molluscs, sulphites
};

/** Keywords that indicate an allergen is present in a dish description. */
const ALLERGEN_KEYWORDS: Record<string, string[]> = {
  fish: ["fish", "salmon", "tuna", "cod", "branzino", "mackerel", "anchovy", "catfish"],
  shellfish: ["shrimp", "crab", "lobster", "clam", "mussel", "oyster", "squid", "octopus", "prawn", "scallop"],
  soybeans: ["soy", "tofu", "edamame", "miso", "tempeh"],
  sesame: ["sesame", "tahini"],
  eggs: ["egg", "omelette", "tamago", "meringue"],
  milk: ["cheese", "cream", "butter", "yogurt", "milk", "ricotta", "burrata", "mozzarella", "paneer", "mascarpone"],
};

/**
 * Apollo Evaluator — dietary safety verification.
 *
 * Double-checks every dish against the user's dietary restrictions and allergen exclusions.
 * Removes unsafe dishes and adds warning labels to uncertain ones.
 */
export function verify(
  dishes: DishResult[],
  restrictions: DietaryFlags,
  allergenExclusions?: string[]
): DishResult[] {
  const activeRestrictions = Object.entries(restrictions)
    .filter(([, v]) => v === true)
    .map(([k]) => k as keyof DietaryFlags);

  const allergens = allergenExclusions ?? [];
  if (activeRestrictions.length === 0 && allergens.length === 0) return dishes;

  return dishes
    .filter((dish) => {
      // Allergen keyword filtering — check dish description for allergen indicators
      for (const allergen of allergens) {
        // If allergen maps to a dietary flag, use that
        const flagKey = ALLERGEN_TO_FLAG[allergen];
        if (flagKey) {
          const flag = dish.dietary_flags?.[flagKey];
          if (flag === false) return false;
          if (flag !== true) {
            // Unknown — check description keywords
            const keywords = ALLERGEN_KEYWORDS[allergen] || [allergen];
            const desc = (dish.description || "").toLowerCase();
            const name = (dish.name || "").toLowerCase();
            if (keywords.some((kw) => desc.includes(kw) || name.includes(kw))) return false;
          }
        } else {
          // No flag mapping — use keyword matching only
          const keywords = ALLERGEN_KEYWORDS[allergen] || [allergen];
          const desc = (dish.description || "").toLowerCase();
          const name = (dish.name || "").toLowerCase();
          if (keywords.some((kw) => desc.includes(kw) || name.includes(kw))) return false;
        }
      }

      for (const restriction of activeRestrictions) {
        const flag = dish.dietary_flags?.[restriction];
        const confidence = dish.dietary_confidence ?? 0;
        const isCritical = ALLERGY_CRITICAL.includes(restriction);

        // Explicitly non-compliant → exclude
        if (flag === false) return false;

        // Unknown flag + low confidence → exclude
        if (flag === null && confidence < THRESHOLDS.UNKNOWN_FLAG_MIN) return false;

        // Allergy-critical: must be explicitly true with high confidence
        if (isCritical && (flag !== true || confidence < THRESHOLDS.ALLERGY_CRITICAL_MIN)) return false;
      }
      return true;
    })
    .map((dish) => {
      const warnings: string[] = [...dish.warnings];

      for (const restriction of activeRestrictions) {
        const flag = dish.dietary_flags?.[restriction];
        const confidence = dish.dietary_confidence ?? 0;

        // Flag is true but confidence below threshold → add warning
        if (flag === true && confidence < THRESHOLDS.WARNING_THRESHOLD) {
          const label = restriction.replace(/_/g, " ");
          warnings.push(
            `Likely ${label} based on menu analysis, but not verified by the restaurant`
          );
        }

        // Flag is null but confidence >= threshold → borderline, warn
        if (flag === null && confidence >= THRESHOLDS.UNKNOWN_FLAG_MIN) {
          const label = restriction.replace(/_/g, " ");
          warnings.push(
            `${label} status unknown — exercise caution`
          );
        }
      }

      return { ...dish, warnings };
    });
}
