import { createHash } from "node:crypto";

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from "@nestjs/common";
import { MembershipRole, McqSource, Prisma } from "@prisma/client";

import type { McqSetResponse, McqSetsListResponse } from "@career-pilot/types";

import { LlmService } from "../ai/llm.service";
import { AuthService } from "../auth/auth.service";
import { PrismaService } from "../prisma/prisma.service";

import { MCQ_SCHEMA, MCQ_SYSTEM_PROMPT, buildMcqUserMsg, type McqRawItem } from "./mcq.prompt";
import { compressProfile, type CompressedMcqProfile } from "./profile-compressor";

const LETTERS = ["A", "B", "C", "D"] as const;

type McqSetWithItems = Prisma.McqSetGetPayload<{
  include: {
    items: {
      include: {
        options: true;
      };
    };
  };
}>;

@Injectable()
export class McqService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly llmService: LlmService
  ) {}

  async generate(token: string | undefined, input: { subject: string; count?: number }): Promise<McqSetResponse> {
    const userId = await this.requireStudentUserId(token);

    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId }
    });

    if (!profile) {
      throw new BadRequestException("A student profile is required first.");
    }

    const subject = input.subject.trim();
    if (!subject) {
      throw new BadRequestException("Subject is required.");
    }

    const compressed = compressProfile(profile, subject, input.count ?? 10);
    const cacheKey = this.buildCacheKey(compressed);

    const cached = await this.prisma.mcqSet.findFirst({
      where: { cacheKey },
      orderBy: { createdAt: "desc" },
      include: { items: { include: { options: true } } }
    });

    if (cached) {
      const cloned = await this.cloneFromCache(cached, userId, profile.id, compressed, cacheKey);
      return this.serialize(cloned);
    }

    const raw = await this.llmService
      .generateStructuredJson<McqRawItem[]>({
        systemInstruction: MCQ_SYSTEM_PROMPT,
        prompt: buildMcqUserMsg(compressed),
        schema: MCQ_SCHEMA as unknown as Record<string, unknown>,
        temperature: 0.65
      })
      .catch((err) => {
        console.error("LLM MCQ generation failed:", err?.message || err);
        return null;
      });

    const validItems = this.validate(raw, compressed.count);

    if (!validItems) {
      const fallback = await this.persistFallbackSet(userId, profile.id, compressed, cacheKey);
      return this.serialize(fallback);
    }

    const persisted = await this.persistSet(userId, profile.id, compressed, cacheKey, "gemini", validItems);
    return this.serialize(persisted);
  }

  async getSet(token: string | undefined, setId: string): Promise<McqSetResponse> {
    const userId = await this.requireStudentUserId(token);
    const stored = await this.prisma.mcqSet.findFirst({
      where: { id: setId, userId },
      include: { items: { include: { options: true } } }
    });

    if (!stored) {
      throw new NotFoundException("MCQ set not found.");
    }

    return this.serialize(stored);
  }

  async listSets(token: string | undefined): Promise<McqSetsListResponse> {
    const userId = await this.requireStudentUserId(token);
    const rows = await this.prisma.mcqSet.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });

    return {
      sets: rows.map((row) => ({
        id: row.id,
        source: row.source,
        subject: row.subject,
        grade: row.grade,
        level: row.level,
        count: row.count,
        audience: row.audience,
        weakTopics: row.weakTopics,
        createdAt: row.createdAt.toISOString()
      }))
    };
  }

  private buildCacheKey(p: CompressedMcqProfile): string {
    const key = [p.grade, p.subject.toLowerCase(), p.weak.toLowerCase(), p.level, p.count, p.audience].join("|");
    return createHash("sha256").update(key).digest("hex");
  }

  private validate(raw: McqRawItem[] | null, expectedCount: number): McqRawItem[] | null {
    if (!raw || !Array.isArray(raw) || raw.length === 0) {
      return null;
    }

    const trimmed = raw.slice(0, expectedCount);
    for (const item of trimmed) {
      if (!item || typeof item !== "object") return null;
      if (typeof item.q !== "string" || !item.q.trim()) return null;
      if (!Array.isArray(item.o) || item.o.length !== 4) return null;
      if (item.o.some((opt) => typeof opt !== "string" || !opt.trim())) return null;
      if (typeof item.a !== "string" || !LETTERS.includes(item.a as (typeof LETTERS)[number])) return null;
      if (typeof item.d !== "string") return null;
      if (!Number.isInteger(item.l) || item.l < 1 || item.l > 3) return null;
      if (typeof item.tag !== "string" || !item.tag.trim()) return null;
    }

    return trimmed;
  }

  private async persistSet(
    userId: string,
    profileId: string,
    compressed: CompressedMcqProfile,
    cacheKey: string,
    source: McqSource,
    items: McqRawItem[]
  ): Promise<McqSetWithItems> {
    return this.prisma.$transaction(async (tx) => {
      const set = await tx.mcqSet.create({
        data: {
          userId,
          studentProfileId: profileId,
          cacheKey,
          source,
          grade: compressed.grade,
          subject: compressed.subject,
          audience: compressed.audience,
          weakTopics: compressed.weak,
          level: compressed.level,
          count: items.length
        }
      });

      for (let i = 0; i < items.length; i++) {
        const r = items[i];
        const item = await tx.mcqItem.create({
          data: {
            setId: set.id,
            orderIndex: i,
            tag: r.tag,
            difficulty: r.l,
            stem: r.q,
            explanation: r.d,
            correctLetter: r.a
          }
        });

        await tx.mcqOption.createMany({
          data: r.o.map((text, idx) => ({
            itemId: item.id,
            letter: LETTERS[idx],
            orderIndex: idx,
            text: this.stripLetterPrefix(text, LETTERS[idx]),
            isCorrect: LETTERS[idx] === r.a
          }))
        });
      }

      return tx.mcqSet.findUniqueOrThrow({
        where: { id: set.id },
        include: { items: { include: { options: true } } }
      });
    });
  }

  private async persistFallbackSet(
    userId: string,
    profileId: string,
    compressed: CompressedMcqProfile,
    cacheKey: string
  ): Promise<McqSetWithItems> {
    const items = this.buildFallbackItems(compressed);
    return this.persistSet(userId, profileId, compressed, cacheKey, "fallback", items);
  }

  private async cloneFromCache(
    source: McqSetWithItems,
    userId: string,
    profileId: string,
    compressed: CompressedMcqProfile,
    cacheKey: string
  ): Promise<McqSetWithItems> {
    return this.prisma.$transaction(async (tx) => {
      const set = await tx.mcqSet.create({
        data: {
          userId,
          studentProfileId: profileId,
          cacheKey,
          source: "cache",
          grade: compressed.grade,
          subject: compressed.subject,
          audience: compressed.audience,
          weakTopics: compressed.weak,
          level: compressed.level,
          count: source.items.length
        }
      });

      const orderedItems = [...source.items].sort((a, b) => a.orderIndex - b.orderIndex);
      for (let i = 0; i < orderedItems.length; i++) {
        const original = orderedItems[i];
        const item = await tx.mcqItem.create({
          data: {
            setId: set.id,
            orderIndex: i,
            tag: original.tag,
            difficulty: original.difficulty,
            stem: original.stem,
            explanation: original.explanation,
            correctLetter: original.correctLetter
          }
        });

        const orderedOptions = [...original.options].sort((a, b) => a.orderIndex - b.orderIndex);
        await tx.mcqOption.createMany({
          data: orderedOptions.map((opt) => ({
            itemId: item.id,
            letter: opt.letter,
            orderIndex: opt.orderIndex,
            text: opt.text,
            isCorrect: opt.isCorrect
          }))
        });
      }

      return tx.mcqSet.findUniqueOrThrow({
        where: { id: set.id },
        include: { items: { include: { options: true } } }
      });
    });
  }

  private stripLetterPrefix(text: string, letter: string): string {
    const patterns = [
      new RegExp(`^\\s*${letter}\\s*[\\).:\\-]\\s*`, "i"),
      new RegExp(`^\\s*${letter}\\s+`, "i")
    ];
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return text.replace(pattern, "").trim();
      }
    }
    return text.trim();
  }

  private buildFallbackItems(compressed: CompressedMcqProfile): McqRawItem[] {
    const stems = [
      {
        q: `Which of the following best describes a core concept in ${compressed.subject}?`,
        options: ["A foundational idea", "An unrelated topic", "A decorative element", "A random guess"],
        correct: "A",
        tag: "concepts"
      },
      {
        q: `When studying ${compressed.subject}, which habit supports the strongest learning?`,
        options: ["Regular spaced practice", "Cramming the night before", "Skipping review", "Memorizing without understanding"],
        correct: "A",
        tag: "study skills"
      },
      {
        q: `Which approach helps you apply ${compressed.subject} to real-world problems?`,
        options: ["Connecting concepts to examples", "Reading only", "Ignoring patterns", "Guessing answers"],
        correct: "A",
        tag: "application"
      },
      {
        q: `What is the most useful first step when facing a new ${compressed.subject} problem?`,
        options: ["Understand what is being asked", "Skip to the answer", "Ask someone else", "Give up"],
        correct: "A",
        tag: "problem solving"
      },
      {
        q: `Which practice best reveals gaps in your understanding of ${compressed.subject}?`,
        options: ["Trying practice questions", "Rereading notes silently", "Skipping the hard parts", "Watching videos only"],
        correct: "A",
        tag: "self assessment"
      },
      {
        q: `When you get a ${compressed.subject} question wrong, what is the most useful response?`,
        options: ["Review why and try a similar one", "Ignore it", "Blame the question", "Move on without thinking"],
        correct: "A",
        tag: "growth mindset"
      },
      {
        q: `Which resource is most reliable for learning ${compressed.subject}?`,
        options: ["A textbook or verified source", "A random social post", "A friend's guess", "No source at all"],
        correct: "A",
        tag: "information literacy"
      },
      {
        q: `Which method best helps you remember ${compressed.subject} ideas long-term?`,
        options: ["Explaining it in your own words", "Reading it once", "Highlighting only", "Skipping review"],
        correct: "A",
        tag: "retention"
      },
      {
        q: `In a ${compressed.subject} assignment, what indicates deep understanding?`,
        options: ["Applying ideas to new situations", "Copying examples", "Matching format only", "Guessing answers"],
        correct: "A",
        tag: "mastery"
      },
      {
        q: `Which mindset helps you improve fastest in ${compressed.subject}?`,
        options: ["Effort leads to improvement", "Ability is fixed", "Mistakes mean failure", "Asking questions is weak"],
        correct: "A",
        tag: "mindset"
      }
    ];

    return stems.slice(0, compressed.count).map((template) => ({
      q: template.q,
      o: template.options,
      a: template.correct,
      d: `The correct choice reflects effective learning in ${compressed.subject}.`,
      l: Math.min(3, Math.max(1, compressed.level)),
      tag: template.tag
    }));
  }

  private async requireStudentUserId(token: string | undefined): Promise<string> {
    const session = await this.authService.getAuthenticatedSession(token);

    if (!session) {
      throw new UnauthorizedException("Authentication required.");
    }

    const activeMembership = session.user.memberships.find((membership) => membership.status === "active") || null;

    if (activeMembership?.role === MembershipRole.school_admin) {
      throw new ForbiddenException("Student access required.");
    }

    return session.user.id;
  }

  private serialize(row: McqSetWithItems): McqSetResponse {
    const orderedItems = [...row.items].sort((a, b) => a.orderIndex - b.orderIndex);

    return {
      set: {
        id: row.id,
        source: row.source,
        subject: row.subject,
        grade: row.grade,
        level: row.level,
        count: row.count,
        audience: row.audience,
        weakTopics: row.weakTopics,
        createdAt: row.createdAt.toISOString()
      },
      items: orderedItems.map((item) => ({
        id: item.id,
        orderIndex: item.orderIndex,
        tag: item.tag,
        difficulty: item.difficulty,
        stem: item.stem,
        explanation: item.explanation,
        correctLetter: item.correctLetter,
        options: [...item.options]
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((opt) => ({
            letter: opt.letter,
            orderIndex: opt.orderIndex,
            text: opt.text,
            isCorrect: opt.isCorrect
          }))
      }))
    };
  }
}
