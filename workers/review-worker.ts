import { Worker, type Job } from "bullmq";
import { connection, reviewQueue } from "./queues";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

interface ReviewJobData {
  restaurantId: string;
  googlePlaceId?: string;
  yelpBusinessId?: string;
}

async function processReviewJob(job: Job<ReviewJobData>) {
  const { restaurantId, googlePlaceId, yelpBusinessId } = job.data;

  // Dynamic import to use the existing review aggregator
  const { aggregateReviews } = await import("../src/lib/agents/review-aggregator/index");

  job.log(`Aggregating reviews for restaurant ${restaurantId}`);

  const result = await aggregateReviews(
    restaurantId,
    googlePlaceId || "",
    yelpBusinessId || null
  );

  if (result.dishSummaries) {
    job.log(`Processed ${result.dishSummaries.length} dish review summaries`);
  }

  return { restaurantId, reviewCount: result.dishSummaries?.length || 0 };
}

export const reviewWorker = new Worker("review-aggregation", processReviewJob, {
  connection,
  concurrency: 2,
  limiter: { max: 5, duration: 60_000 }, // 5 reviews/min
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 50 },
});

reviewWorker.on("completed", (job) => {
  console.log(`[review-worker] Completed: ${job.id} — ${JSON.stringify(job.returnvalue)}`);
});

reviewWorker.on("failed", (job, err) => {
  console.error(`[review-worker] Failed: ${job?.id} — ${err.message}`);
});

export { reviewQueue };
