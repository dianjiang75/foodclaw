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
 * Apollo Evaluator — dietary safety verification.
 *
 * Double-checks every dish against the user's dietary restrictions.
 * Removes unsafe dishes and adds warning labels to uncertain ones.
 */
export function verify(
  dishes: DishResult[],
  restrictions: DietaryFlags
): DishResult[] {
  const activeRestrictions = Object.entries(restrictions)
    .filter(([, v]) => v === true)
    .map(([k]) => k as keyof DietaryFlags);

  if (activeRestrictions.length === 0) return dishes;

  return dishes
    .filter((dish) => {
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
