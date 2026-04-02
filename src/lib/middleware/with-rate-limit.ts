/**
 * Rate-limiting wrapper for API route handlers.
 * Usage: export const GET = withRateLimit("read", handler);
 *
 * The inner handler receives a plain Request so it works in tests
 * without constructing NextRequest. Next.js passes NextRequest at
 * runtime (which extends Request), so everything is compatible.
 */
import { checkApiRateLimit, getRouteCategory } from "./rate-limiter";
import { apiRateLimited } from "@/lib/utils/api-response";

type RouteHandler<T extends Request = Request> = (
  req: T,
  context?: { params: Promise<Record<string, string>> }
) => Promise<Response> | Response;

/**
 * Wraps a route handler with IP-based rate limiting.
 *
 * @param categoryOverride - Rate limit tier ("read", "write", "search", "crawl"),
 *   or null to auto-detect from the route path.
 * @param handler - The route handler to wrap.
 */
export function withRateLimit(
  categoryOverride: string | null,
  handler: RouteHandler
): RouteHandler {
  return async (req, context) => {
    const category =
      categoryOverride ?? getRouteCategory(new URL(req.url).pathname);

    if (!category) return handler(req, context);

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";

    const result = await checkApiRateLimit(ip, category);

    if (!result.allowed) {
      return apiRateLimited(result.retryAfterSeconds);
    }

    const response = await handler(req, context);

    // Add rate limit headers to successful responses
    if (result.remaining >= 0) {
      response.headers.set("X-RateLimit-Remaining", String(result.remaining));
    }

    return response;
  };
}
