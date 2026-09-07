import { Injectable, Logger } from "@nestjs/common";
import { EvaluationScope, EvidenceStatus, Prisma } from "@prisma/client";

import type { EvaluationDimensionScore } from "@career-pilot/types";

import { LlmService } from "../ai/llm.service";
import { NotificationService } from "../notifications/notification.service";
import { PrismaService } from "../prisma/prisma.service";

const DEFAULT_DIMENSIONS = ["rigor", "composure", "ownership", "communication", "adaptability"];
const PROMPT_VERSION = "eval-prompt-v2";

interface RawEvaluation {
  overallScore: number;
  readinessBand: string;
  narrative: string;
  dimensions: EvaluationDimensionScore[];
  strengths: string[];
  risks: string[];
  nextSteps: string[];
}

interface InteractionSummary {
  dayIndex: number;
  kind: string;
  prompt: string;
  response: string;
}

interface EvidenceSummary {
  dayIndex: number;
  kind: string;
  submitted: boolean;
  textBody: string | null;
}

/** Per-dimension decision-quality signal: points earned vs. the best attainable. */
type SignalTotals = Record<string, { achieved: number; max: number }>;

interface ScenarioOption {
  id: string;
  next?: string;
  signals?: Record<string, number>;
}
interface ScenarioNode {
  options?: ScenarioOption[];
}
interface ScenarioGraph {
  start: string;
  nodes: Record<string, ScenarioNode>;
}

/**
 * Scores a completed enrollment against the program rubric. Evidence-aware:
 * blends scenario decision signals, submitted evidence, and reflection text.
 * Uses the LLM when configured, with a deterministic signal-based fallback
 * otherwise. Results are versioned (rubric + prompt) for reproducibility.
 * Idempotent.
 */
@Injectable()
export class EvaluationService {
  private readonly logger = new Logger(EvaluationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmService,
    private readonly notificationService: NotificationService
  ) {}

  async runFinalEvaluation(enrollmentId: string): Promise<void> {
    const existing = await this.prisma.evaluationResult.findFirst({
      where: { enrollmentId, scope: EvaluationScope.final }
    });
    if (existing) {
      return;
    }

    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { program: true, programVersion: { include: { rubric: true } }, dayProgress: true }
    });
    if (!enrollment) {
      this.logger.warn(`Evaluation skipped: enrollment ${enrollmentId} not found.`);
      return;
    }

    const dimensions =
      (enrollment.programVersion.rubric?.dimensionsJson as string[] | undefined)?.filter(
        (value): value is string => typeof value === "string"
      ) ?? DEFAULT_DIMENSIONS;

    const interactions = await this.gatherInteractions(enrollment.id, enrollment.programVersionId);
    const signals = await this.gatherSignals(enrollment.id, enrollment.programVersionId);
    const evidence = await this.gatherEvidence(enrollment.id, enrollment.programVersionId);
    const evidenceCount = evidence.filter((item) => item.submitted).length;

    const completedDays = enrollment.dayProgress.filter((day) => day.state === "completed").length;
    const completionRatio = enrollment.programVersion.durationDays
      ? completedDays / enrollment.programVersion.durationDays
      : 0;

    let scored = await this.scoreWithAi(enrollment.program.title, dimensions, interactions, signals, evidence);
    let scoringSource = "llm";
    if (!scored) {
      scored = this.fallbackScore(dimensions, interactions, completionRatio, signals, evidenceCount);
      scoringSource = "fallback";
    }

    await this.prisma.evaluationResult.create({
      data: {
        enrollmentId,
        scope: EvaluationScope.final,
        rubricVersion: enrollment.programVersion.promptVersion ?? "rubric-v1",
        scoringSource,
        promptVersion: PROMPT_VERSION,
        scoresJson: {
          overallScore: scored.overallScore,
          dimensions: scored.dimensions,
          strengths: scored.strengths,
          risks: scored.risks,
          nextSteps: scored.nextSteps,
          evidenceCount,
          scenarioDecisions: signals.decisions
        } as unknown as Prisma.InputJsonValue,
        narrative: scored.narrative,
        points: Math.round(scored.overallScore),
        readinessBand: scored.readinessBand
      }
    });

    // Mark scored evidence so it isn't re-evaluated and so reviewers can see it landed.
    await this.prisma.evidenceSubmission.updateMany({
      where: { enrollmentId, status: EvidenceStatus.submitted },
      data: { status: EvidenceStatus.scored }
    });

    this.logger.log(
      `Evaluated enrollment ${enrollmentId} (${scoringSource}, band=${scored.readinessBand}, ` +
        `decisions=${signals.decisions}, evidence=${evidenceCount}).`
    );

    await this.notificationService.notifyInApp(
      enrollment.userId,
      "program.result_ready",
      "Your readiness result is ready",
      `Your readiness for ${enrollment.program.title}: ${scored.readinessBand} (${Math.round(scored.overallScore)}/100).`
    );
  }

  private async gatherInteractions(
    enrollmentId: string,
    programVersionId: string
  ): Promise<InteractionSummary[]> {
    const [progress, blocks] = await Promise.all([
      this.prisma.blockProgress.findMany({ where: { enrollmentId } }),
      this.prisma.contentBlock.findMany({
        where: { module: { programDay: { programVersionId } } },
        include: { module: { include: { programDay: true } } }
      })
    ]);

    const progressByBlock = new Map(progress.map((item) => [item.contentBlockId, item]));
    const summaries: InteractionSummary[] = [];

    for (const block of blocks) {
      const bp = progressByBlock.get(block.id);
      if (!bp) {
        continue;
      }
      const body = (block.bodyJson as Record<string, unknown> | null) ?? {};
      const prompt =
        (typeof body.prompt === "string" && body.prompt) ||
        (typeof body.heading === "string" && body.heading) ||
        block.kind;
      const interaction = (bp.interactionJson as Record<string, unknown> | null) ?? {};
      let response = "";
      if (typeof interaction.response === "string") {
        response = interaction.response;
      } else if (Array.isArray(interaction.choices)) {
        response = `chose: ${(interaction.choices as unknown[]).join(" → ")}`;
      } else if (interaction.mediaAssetId) {
        response = `(submitted ${String(interaction.kind ?? "media")} evidence)`;
      } else if (bp.state === "completed") {
        response = "(reviewed)";
      }
      summaries.push({
        dayIndex: block.module.programDay.dayIndex,
        kind: block.kind,
        prompt: String(prompt),
        response
      });
    }

    summaries.sort((a, b) => a.dayIndex - b.dayIndex);
    return summaries;
  }

  /**
   * Replays each scenario the student traversed and accumulates, per dimension,
   * the signal points they earned versus the best attainable at each decision —
   * turning branching choices into objective decision-quality ratios.
   */
  private async gatherSignals(
    enrollmentId: string,
    programVersionId: string
  ): Promise<{ totals: SignalTotals; decisions: number }> {
    const [progress, scenarioBlocks] = await Promise.all([
      this.prisma.blockProgress.findMany({ where: { enrollmentId } }),
      this.prisma.contentBlock.findMany({
        where: { kind: "scenario", module: { programDay: { programVersionId } } },
        include: { scenario: true }
      })
    ]);

    const byBlock = new Map(progress.map((item) => [item.contentBlockId, item]));
    const totals: SignalTotals = {};
    let decisions = 0;

    for (const block of scenarioBlocks) {
      const graph = block.scenario?.graphJson as unknown as ScenarioGraph | null;
      const bp = byBlock.get(block.id);
      const choices = Array.isArray((bp?.interactionJson as Record<string, unknown> | null)?.choices)
        ? ((bp!.interactionJson as Record<string, unknown>).choices as string[])
        : [];
      if (!graph?.nodes || !graph.start || choices.length === 0) {
        continue;
      }

      // Replay the path so each choice is attributed to the node it was made in.
      let nodeKey: string | undefined = graph.start;
      for (const choiceId of choices) {
        const node: ScenarioNode | undefined = nodeKey ? graph.nodes[nodeKey] : undefined;
        const options: ScenarioOption[] = node?.options ?? [];
        if (options.length === 0) {
          break;
        }
        const chosen: ScenarioOption | undefined = options.find((option) => option.id === choiceId);
        if (!chosen) {
          break;
        }
        decisions += 1;
        const nodeMax: Record<string, number> = {};
        for (const option of options) {
          for (const [dim, value] of Object.entries(option.signals ?? {})) {
            nodeMax[dim] = Math.max(nodeMax[dim] ?? 0, value);
          }
        }
        for (const [dim, maxValue] of Object.entries(nodeMax)) {
          totals[dim] = totals[dim] ?? { achieved: 0, max: 0 };
          totals[dim].max += maxValue;
          totals[dim].achieved += chosen.signals?.[dim] ?? 0;
        }
        nodeKey = chosen.next && graph.nodes[chosen.next] ? chosen.next : undefined;
        if (!nodeKey) {
          break;
        }
      }
    }

    return { totals, decisions };
  }

  private async gatherEvidence(enrollmentId: string, programVersionId: string): Promise<EvidenceSummary[]> {
    const [submissions, blocks] = await Promise.all([
      this.prisma.evidenceSubmission.findMany({ where: { enrollmentId } }),
      this.prisma.contentBlock.findMany({
        where: { module: { programDay: { programVersionId } } },
        select: { id: true, module: { select: { programDay: { select: { dayIndex: true } } } } }
      })
    ]);
    const dayByBlock = new Map(blocks.map((block) => [block.id, block.module.programDay.dayIndex]));
    return submissions.map((submission) => ({
      dayIndex: dayByBlock.get(submission.contentBlockId) ?? 0,
      kind: submission.kind,
      submitted: submission.status === EvidenceStatus.submitted || submission.status === EvidenceStatus.scored,
      textBody: submission.textBody
    }));
  }

  /** Renders the per-dimension decision-quality signal as a compact prompt line. */
  private signalSummary(signals: { totals: SignalTotals; decisions: number }): string {
    const parts = Object.entries(signals.totals)
      .filter(([, value]) => value.max > 0)
      .map(([dim, value]) => `${dim} ${value.achieved}/${value.max}`);
    if (parts.length === 0) {
      return "No scenario decisions recorded.";
    }
    return `Scenario decision quality (earned/best across ${signals.decisions} decisions): ${parts.join(", ")}.`;
  }

  private evidenceSummary(evidence: EvidenceSummary[]): string {
    const submitted = evidence.filter((item) => item.submitted);
    if (submitted.length === 0) {
      return "No media evidence submitted.";
    }
    return submitted
      .map(
        (item) =>
          `Day ${item.dayIndex}: submitted ${item.kind} evidence${item.textBody ? ` — note: ${item.textBody}` : ""}`
      )
      .join("\n");
  }

  private async scoreWithAi(
    programTitle: string,
    dimensions: string[],
    interactions: InteractionSummary[],
    signals: { totals: SignalTotals; decisions: number },
    evidence: EvidenceSummary[]
  ): Promise<RawEvaluation | null> {
    if (!this.llm.isConfigured() || interactions.length === 0) {
      return null;
    }

    const transcript = interactions
      .map((item) => `Day ${item.dayIndex} [${item.kind}] ${item.prompt}\n  → ${item.response || "(no response)"}`)
      .join("\n");

    const schema = {
      type: "object",
      properties: {
        overallScore: { type: "number" },
        readinessBand: { type: "string", enum: ["emerging", "developing", "strong", "exceptional"] },
        narrative: { type: "string" },
        dimensions: {
          type: "array",
          items: {
            type: "object",
            properties: { key: { type: "string" }, score: { type: "number" }, label: { type: "string" } },
            required: ["key", "score", "label"]
          }
        },
        strengths: { type: "array", items: { type: "string" } },
        risks: { type: "array", items: { type: "string" } },
        nextSteps: { type: "array", items: { type: "string" } }
      },
      required: ["overallScore", "readinessBand", "narrative", "dimensions", "strengths", "risks", "nextSteps"]
    };

    try {
      const result = await this.llm.generateStructuredJson<RawEvaluation>({
        systemInstruction:
          "You are a career-readiness assessor. Score a student's behaviour across a multi-day career experience against the given dimensions (0-100). Weight objective scenario decisions and submitted evidence over self-reported text. Be fair, specific, and grounded only in the provided signals.",
        prompt: `Program: ${programTitle}\nDimensions: ${dimensions.join(", ")}\n\n${this.signalSummary(
          signals
        )}\n\nEvidence:\n${this.evidenceSummary(
          evidence
        )}\n\nStudent transcript:\n${transcript}\n\nReturn JSON scoring each dimension, an overall score (0-100), a readiness band, a short narrative, and concise strengths, risks, and next steps.`,
        schema,
        temperature: 0.4
      });
      if (!result || typeof result.overallScore !== "number" || !Array.isArray(result.dimensions)) {
        return null;
      }
      return result;
    } catch (error) {
      this.logger.warn(`AI evaluation failed, using fallback: ${(error as Error)?.message}`);
      return null;
    }
  }

  /**
   * Deterministic fallback. Blends program completion, reflection engagement,
   * submitted evidence, and — crucially — per-dimension scenario decision
   * quality, so dimensions the student demonstrably handled well score higher.
   */
  private fallbackScore(
    dimensions: string[],
    interactions: InteractionSummary[],
    completionRatio: number,
    signals: { totals: SignalTotals; decisions: number },
    evidenceCount: number
  ): RawEvaluation {
    const substantive = interactions.filter((item) => item.response && item.response.length > 20).length;
    const engagement = interactions.length > 0 ? substantive / interactions.length : 0;
    const evidenceBoost = Math.min(evidenceCount, 3) * 2;
    const base = Math.min(95, 45 + completionRatio * 26 + engagement * 12 + evidenceBoost);

    const dimensionScores: EvaluationDimensionScore[] = dimensions.map((key) => {
      const total = signals.totals[key];
      const ratio = total && total.max > 0 ? total.achieved / total.max : null;
      // Where a dimension was exercised by decisions, weight it 50/50 with the base.
      const score = ratio !== null ? Math.round(0.5 * base + 0.5 * (40 + 55 * ratio)) : Math.round(base);
      return { key, score: Math.max(0, Math.min(100, score)), label: key.charAt(0).toUpperCase() + key.slice(1) };
    });

    const overallScore = Math.round(
      dimensionScores.reduce((sum, dim) => sum + dim.score, 0) / Math.max(1, dimensionScores.length)
    );
    const readinessBand =
      overallScore >= 85 ? "exceptional" : overallScore >= 70 ? "strong" : overallScore >= 50 ? "developing" : "emerging";

    const strengths: string[] = [];
    if (completionRatio >= 1) strengths.push("Completed the full multi-day program");
    if (signals.decisions > 0) strengths.push(`Made ${signals.decisions} scenario decisions under realistic pressure`);
    if (evidenceCount > 0) strengths.push(`Submitted ${evidenceCount} piece(s) of media evidence`);
    if (strengths.length === 0) strengths.push("Engaged with the program");

    const risks: string[] = [];
    if (completionRatio < 1) risks.push("Program not fully completed");
    if (evidenceCount === 0) risks.push("No media evidence submitted to corroborate reflections");

    return {
      overallScore,
      readinessBand,
      narrative:
        "Readiness estimated deterministically from program completion, scenario decision quality, submitted evidence, and reflection engagement (AI scoring was unavailable).",
      dimensions: dimensionScores,
      strengths,
      risks,
      nextSteps: ["Revisit weaker days", "Submit evidence where prompted", "Try a proof session for a specific career"]
    };
  }
}
