// The background worker now runs as a second entrypoint of the API's NestJS
// app (shared domain services via DI). This package only delegates:
//   dev:   pnpm --filter @career-pilot/api worker
//   start: pnpm --filter @career-pilot/api start:worker
// Run those instead of this file.
console.error(
  "This launcher is superseded. Run `pnpm --filter @career-pilot/api worker` (dev) " +
    "or `pnpm --filter @career-pilot/api start:worker` (prod)."
);
process.exit(1);
