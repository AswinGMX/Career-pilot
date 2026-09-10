function normalizeOrigins(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)).map((value) => value.trim()).filter(Boolean))];
}

function fromCommaSeparatedEnv(value?: string): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getAllowedOrigins(): string[] {
  const appBaseUrl = process.env.APP_BASE_URL;
  const corsOrigins = fromCommaSeparatedEnv(process.env.CORS_ALLOWED_ORIGINS);

  return normalizeOrigins([
    appBaseUrl,
    ...corsOrigins,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001"
  ]);
}
