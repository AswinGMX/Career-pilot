import type { Prisma } from "@prisma/client";

export interface CompressedMcqProfile {
  grade: number;
  subject: string;
  weak: string;
  level: number;
  count: number;
  audience: string;
}

function fromJsonArray(value: Prisma.JsonValue | null | undefined): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function parseGrade(gradeLevel: string | null | undefined): number | null {
  if (!gradeLevel) return null;
  const match = gradeLevel.match(/\d+/);
  if (!match) return null;
  const n = parseInt(match[0], 10);
  return Number.isFinite(n) && n >= 1 && n <= 12 ? n : null;
}

type ProfileShape = {
  gradeLevel: string | null;
  favoriteSubjects: Prisma.JsonValue | null;
  topicsCuriousAbout: Prisma.JsonValue | null;
};

export function compressProfile(
  profile: ProfileShape,
  subject: string,
  count = 10
): CompressedMcqProfile {
  const grade = parseGrade(profile.gradeLevel) ?? 9;
  const level = grade <= 6 ? 1 : grade <= 9 ? 2 : 3;

  const curious = fromJsonArray(profile.topicsCuriousAbout);
  const subjects = fromJsonArray(profile.favoriteSubjects);
  const weakList = (curious.length ? curious : subjects).slice(0, 3);
  const weak = weakList.length > 0 ? weakList.join(", ") : `${subject} basics`;

  const clampedCount = Math.max(1, Math.min(count, 20));

  return {
    grade,
    subject,
    weak,
    level,
    count: clampedCount,
    audience: `grade ${grade}`
  };
}
