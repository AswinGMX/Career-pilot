import "reflect-metadata";

import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

import { WorkerModule } from "./worker/worker.module";
import { WorkerRunner } from "./worker/worker.runner";

/**
 * Background worker entrypoint. Runs the NestJS DI container without an HTTP
 * server and starts the BullMQ queue workers. Deploy the same image as the API
 * with this command to scale workers independently of web traffic.
 */
async function bootstrap(): Promise<void> {
  const logger = new Logger("Worker");

  const context = await NestFactory.createApplicationContext(WorkerModule, {
    logger: ["log", "warn", "error"]
  });
  context.enableShutdownHooks();

  context.get(WorkerRunner).start();
  logger.log("Career Pilot worker process is running.");
}

void bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Worker failed to start:", error);
  process.exit(1);
});
