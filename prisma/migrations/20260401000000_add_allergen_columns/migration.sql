-- Add allergen exclusions and custom restrictions to user profiles
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "allergen_exclusions" TEXT[] DEFAULT '{}';
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "custom_restrictions" TEXT[] DEFAULT '{}';
