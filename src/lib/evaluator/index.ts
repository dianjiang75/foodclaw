import type { DietaryFlags } from "@/types";
import type { DishResult } from "@/lib/orchestrator/types";

// Allergy-critical restrictions that need stricter filtering
const ALLERGY_CRITICAL: (keyof DietaryFlags)[] = ["nut_free", "gluten_free"];

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
    .filter(([_, v]) => v === true)
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
        if (flag === null && confidence < 0.7) return false;

        // Allergy-critical: must be explicitly true with high confidence
        if (isCritical && (flag !== true || confidence < 0.85)) return false;
      }
      return true;
    })
    .map((dish) => {
      const warnings: string[] = [...dish.warnings];

      for (const restriction of activeRestrictions) {
        const flag = dish.dietary_flags?.[restriction];
        const confidence = dish.dietary_confidence ?? 0;

        // Flag is true but confidence below 0.9 → add warning
        if (flag === true && confidence < 0.9) {
          const label = restriction.replace(/_/g, " ");
          warnings.push(
            `Likely ${label} based on menu analysis, but not verified by the restaurant`
          );
        }

        // Flag is null but confidence >= 0.7 → borderline, warn
        if (flag === null && confidence >= 0.7) {
          const label = restriction.replace(/_/g, " ");
          warnings.push(
            `${label} status unknown — exercise caution`
          );
        }
      }

      return { ...dish, warnings };
    });
}
