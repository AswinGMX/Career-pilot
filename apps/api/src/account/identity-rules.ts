import { BadRequestException } from "@nestjs/common";

/**
 * Pure validation/normalisation rules for account profile fields.
 *
 * Kept free of Nest and Prisma so the rules can be unit-tested directly and so
 * there is exactly one definition of "valid" shared by every caller — the HTTP
 * DTOs validate shape, this module decides meaning.
 */

/**
 * E.164: a leading "+", a non-zero country code, 8-15 digits total. Deliberately
 * strict — a phone number stored in a local format cannot be dialled or matched
 * across regions, which defeats the point of collecting it.
 */
const E164_PATTERN = /^\+[1-9]\d{7,14}$/;

export function normalizePhone(raw: string): string {
  // Accept the spaces, hyphens and brackets people actually type.
  const candidate = raw.replace(/[\s()\-.]/g, "");

  if (!E164_PATTERN.test(candidate)) {
    throw new BadRequestException("Enter the phone number in international format, e.g. +919876543210.");
  }

  return candidate;
}

/**
 * IANA time zone identifiers known to this runtime.
 *
 * `Intl.supportedValuesOf` is ES2022 and the API targets ES2021, hence the
 * cast. When it is unavailable the list is empty and validation falls back to
 * asking the runtime to format a date in the zone, which throws for unknown
 * zones — correctness is preserved either way.
 */
function supportedTimeZones(): string[] {
  const intl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
  try {
    return intl.supportedValuesOf?.("timeZone") ?? [];
  } catch {
    return [];
  }
}

/**
 * Suggestions for the picker — NOT an allowlist.
 *
 * `supportedValuesOf` returns only the zones CLDR considers canonical, which
 * omits widely used aliases: this runtime lists `Asia/Calcutta` and not
 * `Asia/Kolkata`, so treating it as an allowlist would reject the canonical
 * IANA name for most of the app's users.
 */
export function listTimeZones(): string[] {
  return supportedTimeZones();
}

/**
 * Validate by construction rather than by membership: ask the runtime to build
 * a formatter in the zone, which accepts every zone ICU knows (aliases
 * included) and throws for anything it does not. The resolved zone is stored so
 * one place cannot end up with two spellings of the same zone.
 */
export function normalizeTimezone(raw: string): string {
  const candidate = raw.trim();

  if (!candidate) {
    throw new BadRequestException("Select a time zone.");
  }

  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: candidate }).resolvedOptions().timeZone;
  } catch {
    throw new BadRequestException(`"${raw}" is not a recognised time zone.`);
  }
}

/** Locales the UI ships copy for. Anything else is accepted but unstyled. */
const SUGGESTED_LOCALES = ["en-GB", "en-IN", "en-US", "hi-IN", "ta-IN", "te-IN", "ml-IN", "kn-IN", "mr-IN", "bn-IN"];

export function listLocales(): string[] {
  return SUGGESTED_LOCALES;
}

export function normalizeLocale(raw: string): string {
  const candidate = raw.trim();

  try {
    const [canonical] = Intl.getCanonicalLocales(candidate);
    if (!canonical) {
      throw new Error("empty");
    }
    return canonical;
  } catch {
    throw new BadRequestException(`"${raw}" is not a valid language tag. Use a form like "en-IN".`);
  }
}

/** Display name derived from the parts, falling back to what the user had. */
export function composeFullName(firstName: string | null, lastName: string | null, fallback: string): string {
  const composed = [firstName, lastName]
    .map((part) => part?.trim() || "")
    .filter(Boolean)
    .join(" ");

  return composed || fallback;
}
