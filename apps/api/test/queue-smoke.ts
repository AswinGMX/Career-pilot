import "reflect-metadata";

import { Queue, QueueEvents } from "bullmq";

import { JOB_NAMES, QUEUE_NAMES } from "../src/queue/queue.constants";
import { createRedisConnection } from "../src/queue/redis.connection";

/**
 * Proves the producer -> Redis -> worker pipeline. Requires the worker process
 * to be running (`pnpm --filter @career-pilot/api worker`). Enqueues a ping job
 * and waits for the worker to complete it.
 */
async function main(): Promise<void> {
  const connection = createRedisConnection("smoke-producer");
  const eventsConnection = createRedisConnection("smoke-events");

  const queue = new Queue(QUEUE_NAMES.scheduling, { connection });
  const events = new QueueEvents(QUEUE_NAMES.scheduling, { connection: eventsConnection });
  await events.waitUntilReady();

  const job = await queue.add(JOB_NAMES.ping, {
    enqueuedAt: new Date().toISOString(),
    payload: { hello: "career-pilot", ts: new Date().toISOString() }
  });

  console.log(`[smoke] enqueued ping job id=${job.id}; awaiting worker completion...`);
  const result = await job.waitUntilFinished(events, 15_000);
  console.log(`[smoke] PASS — worker returned: ${JSON.stringify(result)}`);

  await queue.close();
  await events.close();
  await connection.quit();
  await eventsConnection.quit();
  process.exit(0);
}

main().catch((error) => {
  console.error(`[smoke] FAIL — ${(error as Error)?.message ?? error}`);
  process.exit(1);
});
