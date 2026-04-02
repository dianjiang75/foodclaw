import { Queue } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

const defaultJobOptions = {
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 500 },
};

export const menuCrawlQueue = new Queue("menu-crawl", { connection, defaultJobOptions });
export const photoAnalysisQueue = new Queue("photo-analysis", { connection, defaultJobOptions });
export const logisticsQueue = new Queue("logistics-update", { connection, defaultJobOptions });
export const reviewQueue = new Queue("review-aggregation", { connection, defaultJobOptions });
export const deadLetterQueue = new Queue("dead-letter", { connection, defaultJobOptions: { removeOnComplete: { count: 500 }, removeOnFail: { count: 1000 } } });

export { connection };
