/**
 * Env validation — imported early to fail-fast if critical vars are missing.
 */
const REQUIRED_VARS = ["DATABASE_URL", "REDIS_URL"] as const;
const REQUIRED_IN_PROD = ["JWT_SECRET", "ANTHROPIC_API_KEY"] as const;

export function validateEnv() {
  const missing: string[] = [];

  for (const key of REQUIRED_VARS) {
    if (!process.env[key]) missing.push(key);
  }

  if (process.env.NODE_ENV === "production") {
    for (const key of REQUIRED_IN_PROD) {
      const val = process.env[key];
      if (!val || val === "placeholder" || val.includes("change-in-production")) {
        missing.push(key);
      }
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. ` +
      `Set them in .env (dev) or Railway dashboard (prod).`
    );
  }
}
