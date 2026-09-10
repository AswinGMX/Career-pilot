import "reflect-metadata";

import cookieParser = require("cookie-parser");
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";
import { getAllowedOrigins } from "./platform/origins";
import { resolveTrustProxy } from "./platform/trust-proxy";

async function bootstrap(): Promise<void> {
  const allowedOrigins = new Set(getAllowedOrigins());
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.has(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error("Origin not allowed by CORS."), false);
      },
      credentials: true
    }
  });
  const expressApp = app.getHttpAdapter().getInstance();

  if (expressApp && typeof expressApp.disable === "function") {
    expressApp.disable("x-powered-by");
  }

  // Must be set before any middleware reads `request.ip`: it is what makes the
  // rate limiter and audit log trust (or ignore) `x-forwarded-for`.
  if (expressApp && typeof expressApp.set === "function") {
    expressApp.set("trust proxy", resolveTrustProxy(process.env.TRUST_PROXY));
  }

  app.setGlobalPrefix("v1");
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true
    })
  );

  // Without this, `onModuleDestroy` never runs on SIGTERM, so a redeploy drops
  // in-flight work and leaves Redis/Prisma sockets to be killed with the process.
  app.enableShutdownHooks();

  const port = Number(process.env.API_PORT || 4000);
  const host = process.env.API_HOST || "127.0.0.1";

  await app.listen(port, host);
}

void bootstrap();
