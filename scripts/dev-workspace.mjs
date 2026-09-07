import net from "node:net";
import { spawn } from "node:child_process";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load apps/api/.env so local overrides (like DATABASE_URL) are picked up
try {
  const envPath = resolve(__dirname, "..", "apps", "api", ".env");
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex);
    const value = trimmed.slice(eqIndex + 1);
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
} catch {
  // .env file not found — fall back to defaults
}

const DEFAULT_DATABASE_URL = "postgresql://career_pilot:career_pilot@127.0.0.1:5432/career_pilot";
const DEFAULT_REDIS_URL = "redis://127.0.0.1:6379";

async function findOpenPort(preferredPort) {
  if (await isPortAvailable(preferredPort)) {
    return preferredPort;
  }

  let nextPort = preferredPort + 1;

  while (!(await isPortAvailable(nextPort))) {
    nextPort += 1;
  }

  return nextPort;
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });

    server.listen(port);
  });
}

async function main() {
  const apiPort = await findOpenPort(Number(process.env.API_PORT || 4000));
  const webPort = await findOpenPort(Number(process.env.PORT || process.env.WEB_PORT || 3000));
  const webOrigins = [`http://localhost:${webPort}`, `http://127.0.0.1:${webPort}`];
  const defaultCorsOrigins = webOrigins.join(",");

  if (process.env.SKIP_LOCAL_INFRA !== "1") {
    console.log("Ensuring local Postgres and Redis are running...");
    execSync("pnpm infra:local:start", {
      stdio: "inherit",
      env: process.env
    });
  }

  const sharedEnv = {
    ...process.env,
    DATABASE_URL: process.env.DATABASE_URL || DEFAULT_DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL || DEFAULT_REDIS_URL
  };

  const apiEnv = {
    ...sharedEnv,
    API_PORT: String(apiPort),
    APP_BASE_URL: process.env.APP_BASE_URL || `http://localhost:${webPort}`,
    CORS_ALLOWED_ORIGINS: process.env.CORS_ALLOWED_ORIGINS || defaultCorsOrigins
  };

  const webEnv = {
    ...sharedEnv,
    PORT: String(webPort),
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || `http://127.0.0.1:${apiPort}/v1`
  };

  // Worker runs by default so queued jobs (evaluations, reports, transcoding)
  // actually get processed locally. Opt out with START_WORKER=0 if you want to
  // exercise the API's read-path self-heal in isolation.
  const startWorker = process.env.START_WORKER !== "0";

  console.log(`Starting Career Pilot local workspace`);
  console.log(`Web: http://localhost:${webPort}`);
  console.log(`API: http://localhost:${apiPort}/v1`);
  console.log(`Metrics: http://localhost:${apiPort}/v1/metrics`);
  console.log(`Worker: ${startWorker ? "enabled" : "disabled (START_WORKER=0)"}`);

  const children = [
    spawn("pnpm", ["--filter", "@career-pilot/api", "dev"], { stdio: "inherit", env: apiEnv }),
    spawn("pnpm", ["--filter", "@career-pilot/web", "dev"], { stdio: "inherit", env: webEnv })
  ];

  if (startWorker) {
    children.push(spawn("pnpm", ["--filter", "@career-pilot/worker", "dev"], { stdio: "inherit", env: sharedEnv }));
  }

  let shuttingDown = false;

  const shutdown = (code = 0) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;

    for (const child of children) {
      if (!child.killed) {
        child.kill("SIGTERM");
      }
    }

    setTimeout(() => {
      for (const child of children) {
        if (!child.killed) {
          child.kill("SIGKILL");
        }
      }

      process.exit(code);
    }, 500);
  };

  process.on("SIGINT", () => shutdown(0));
  process.on("SIGTERM", () => shutdown(0));

  for (const child of children) {
    child.on("exit", (code) => {
      if (shuttingDown) {
        return;
      }

      shutdown(code || 0);
    });
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
