export async function POST(request: Request) {
  try {
    const { google_place_id } = await request.json();

    if (!google_place_id) {
      return Response.json({ error: "google_place_id is required" }, { status: 400 });
    }

    // Dynamic import to avoid loading heavy deps on cold start
    const { menuCrawlQueue } = await import("@/../workers/queues");

    const job = await menuCrawlQueue.add(
      "on-demand-crawl",
      { googlePlaceId: google_place_id },
      { attempts: 3, backoff: { type: "exponential", delay: 5000 } }
    );

    return Response.json({ job_id: job.id, status: "queued" }, { status: 202 });
  } catch {
    return Response.json({ error: "Failed to queue crawl" }, { status: 500 });
  }
}
