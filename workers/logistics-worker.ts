import { Worker, type Job } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

interface LogisticsJobData {
  restaurantId: string;
  restaurantName: string;
  address: string;
}

async function processLogisticsJob(job: Job<LogisticsJobData>) {
  const { restaurantId, restaurantName, address } = job.data;

  console.log(`[logistics-worker] Updating traffic: ${restaurantName}`);

  const { getFootTraffic, storeTrafficData } = await import(
    "../src/lib/agents/logistics-poller"
  );

  const traffic = await getFootTraffic(restaurantName, address);
  await storeTrafficData(restaurantId, traffic);

  console.log(
    `[logistics-worker] ${restaurantName}: ${traffic.current_busyness_pct}% busy, ~${traffic.estimated_wait_minutes}min wait`
  );

  return traffic;
}

const worker = new Worker<LogisticsJobData>(
  "logistics-update",
  processLogisticsJob,
  {
    connection,
    concurrency: 5,
    limiter: {
      max: 20,
      duration: 60000,
    },
  }
);

worker.on("completed", (job) => {
  console.log(`[logistics-worker] Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[logistics-worker] Job ${job?.id} failed:`, err.message);
});

export { worker };
