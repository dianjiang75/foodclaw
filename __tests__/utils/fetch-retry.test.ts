import { fetchWithRetry } from "@/lib/utils/fetch-retry";

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("fetchWithRetry", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns immediately on success", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });
    const res = await fetchWithRetry("https://example.com/api");
    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("returns immediately on non-retryable error (404)", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
    const res = await fetchWithRetry("https://example.com/api");
    expect(res.status).toBe(404);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("retries on 500 and succeeds", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 500, headers: new Headers() })
      .mockResolvedValueOnce({ ok: true, status: 200 });

    const res = await fetchWithRetry("https://example.com/api", undefined, {
      maxRetries: 2,
      baseDelayMs: 10,
    });
    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("retries on 429 and succeeds", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 429, headers: new Headers({ "Retry-After": "1" }) })
      .mockResolvedValueOnce({ ok: true, status: 200 });

    const res = await fetchWithRetry("https://example.com/api", undefined, {
      maxRetries: 2,
      baseDelayMs: 10,
    });
    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("returns failed response after max retries", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 503, headers: new Headers() });

    const res = await fetchWithRetry("https://example.com/api", undefined, {
      maxRetries: 2,
      baseDelayMs: 10,
    });
    expect(res.status).toBe(503);
    expect(mockFetch).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it("throws on network error after max retries", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    await expect(
      fetchWithRetry("https://example.com/api", undefined, {
        maxRetries: 1,
        baseDelayMs: 10,
      })
    ).rejects.toThrow("fetchWithRetry failed after 2 attempts");
  });
});
