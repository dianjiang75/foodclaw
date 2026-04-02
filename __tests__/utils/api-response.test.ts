import { apiSuccess, apiError, apiBadRequest, apiNotFound, apiRateLimited, apiUnavailable } from "@/lib/utils/api-response";

describe("API Response Helpers", () => {
  it("apiSuccess returns 200 with success shape", async () => {
    const res = apiSuccess({ dishes: [] });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toEqual({ dishes: [] });
  });

  it("apiSuccess accepts custom status", async () => {
    const res = apiSuccess({ id: "123" }, 201);
    expect(res.status).toBe(201);
  });

  it("apiError returns error shape", async () => {
    const res = apiError("Something broke", 500);
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Something broke");
  });

  it("apiError includes details when provided", async () => {
    const res = apiError("Validation failed", 400, { field: "email" });
    const body = await res.json();
    expect(body.details).toEqual({ field: "email" });
  });

  it("apiBadRequest returns 400", async () => {
    const res = apiBadRequest("Missing param");
    expect(res.status).toBe(400);
  });

  it("apiNotFound returns 404", async () => {
    const res = apiNotFound();
    expect(res.status).toBe(404);
  });

  it("apiRateLimited returns 429 with Retry-After", async () => {
    const res = apiRateLimited(60);
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("60");
  });

  it("apiUnavailable returns 503", async () => {
    const res = apiUnavailable();
    expect(res.status).toBe(503);
  });
});
