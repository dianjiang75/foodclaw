import { Worker, type Job } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

interface CrawlJobData {
  googlePlaceId: string;
}

async function processCrawlJob(job: Job<CrawlJobData>) {
  const { googlePlaceId } = job.data;

  console.log(`[crawl-worker] Processing: ${googlePlaceId} (attempt ${job.attemptsMade + 1})`);

  // Dynamic import to allow path alias resolution at runtime
  const { crawlRestaurant } = await import("../src/lib/agents/menu-crawler");

  const result = await crawlRestaurant(googlePlaceId);

  console.log(
    `[crawl-worker] Done: ${result.restaurantName} — ${result.dishesFound} dishes, source: ${result.menuSource}`
  );

  return result;
}

const worker = new Worker<CrawlJobData>("menu-crawl", processCrawlJob, {
  connection,
  concurrency: 3,
  limiter: {
    max: 10,
    duration: 60000, // 10 jobs per minute to respect API rate limits
  },
  settings: {
    backoffStrategy: (attemptsMade: number) => {
      // Exponential backoff: 5s, 25s, 125s
      return Math.pow(5, attemptsMade) * 1000;
    },
  },
});

worker.on("completed", (job) => {
  console.log(`[crawl-worker] Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[crawl-worker] Job ${job?.id} failed:`, err.message);
});

export { worker };
