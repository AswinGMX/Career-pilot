import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from "@nestjs/common";
import {
  MembershipRole,
  ProfileCompletionStatus,
  ProofSessionStatus,
  type Prisma,
  type ProofSession as ProofSessionModel
} from "@prisma/client";

import type {
  DimensionDetail,
  GenerateQuestionsResponse,
  ProfileAssessmentResult,
  ProofAnswerInput,
  ProofQuestion,
  ProofQuestionSet,
  ProofResult,
  ProofSessionListResponse,
  ProofSessionRecord,
  ProofSessionResponse,
  SubmitProfileAssessmentResponse
} from "@career-pilot/types";

import { LlmService } from "../ai/llm.service";
import { AuthService } from "../auth/auth.service";
import { PrismaService } from "../prisma/prisma.service";

const proofQuestionCount = 8;
const proofQuestionSetVersion = "proof-v1";

type SessionRecord = Prisma.SessionGetPayload<{
  include: {
    user: {
      include: {
        memberships: {
          include: {
            tenant: true;
          };
        };
      };
    };
  };
}>;

type ProfileRecord = Prisma.StudentProfileGetPayload<{
  include: {
    versions: true;
  };
}>;

type CareerRecord = Prisma.CareerGetPayload<{
  include: {
    category: true;
    detail: true;
  };
}>;

type ProofSessionWithCareer = Prisma.ProofSessionGetPayload<{
  include: {
    career: {
      include: {
        category: true;
      };
    };
  };
}>;

@Injectable()
export class AssessmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly llmService: LlmService
  ) { }

  async startProofSession(token: string | undefined, careerSlug: string): Promise<ProofSessionResponse> {
    const session = await this.requireStudentSession(token);
    const profile = await this.requireSubmittedProfile(session.user.id);
    const career = await this.prisma.career.findUnique({
      where: { slug: careerSlug },
      include: {
        category: true,
        detail: true
      }
    });

    if (!career || !career.detail || career.status !== "active") {
      throw new NotFoundException("Career not found.");
    }

    const questionSet = await this.generateProofQuestionSet(career, profile);

    const stored = await this.prisma.$transaction(async (tx) => {
      const created = await tx.proofSession.create({
        data: {
          userId: session.user.id,
          tenantId: profile.tenantId,
          careerId: career.id,
          studentProfileId: profile.id,
          questionSource: questionSet.source,
          questionSetVersion: proofQuestionSetVersion,
          questionSetJson: questionSet as unknown as Prisma.InputJsonValue
        },
        include: {
          career: {
            include: {
              category: true
            }
          }
        }
      });

      await tx.auditLog.create({
        data: {
          actorUserId: session.user.id,
          tenantId: profile.tenantId,
          action: "proof_session.started",
          entityType: "proof_session",
          entityId: created.id,
          metadata: {
            careerSlug: career.slug,
            questionSource: questionSet.source
          }
        }
      });

      return created;
    });

    return {
      session: this.serializeProofSession(stored)
    };
  }

  async submitProofSession(
    token: string | undefined,
    sessionId: string,
    answers: ProofAnswerInput[]
  ): Promise<ProofSessionResponse> {
    const session = await this.requireStudentSession(token);
    const stored = await this.prisma.proofSession.findFirst({
      where: {
        id: sessionId,
        userId: session.user.id
      },
      include: {
        career: {
          include: {
            category: true,
            detail: true
          }
        },
        studentProfile: {
          include: {
            versions: {
              orderBy: {
                createdAt: "desc"
              }
            }
          }
        }
      }
    });

    if (!stored) {
      throw new NotFoundException("Proof session not found.");
    }

    if (stored.status === ProofSessionStatus.completed) {
      throw new BadRequestException("Proof session has already been completed.");
    }

    const questionSet = this.readQuestionSet(stored.questionSetJson);

    if (answers.length !== questionSet.questions.length) {
      throw new BadRequestException("All proof questions must be answered.");
    }

    const answerIds = new Set(answers.map((item) => item.questionId));
    const hasAllQuestions = questionSet.questions.every((question) => answerIds.has(question.id));

    if (!hasAllQuestions) {
      throw new BadRequestException("Proof answers do not match the active question set.");
    }

    const result = await this.evaluateProofSession(
      stored.career as CareerRecord,
      stored.studentProfile,
      questionSet,
      answers
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.proofSession.update({
        where: {
          id: stored.id
        },
        data: {
          status: ProofSessionStatus.completed,
          answerSetJson: answers as unknown as Prisma.InputJsonValue,
          resultJson: result as unknown as Prisma.InputJsonValue,
          scoringSource: result.source,
          overallScore: result.overallScore,
          points: result.points,
          readinessBand: result.readinessBand,
          completedAt: new Date()
        },
        include: {
          career: {
            include: {
              category: true
            }
          }
        }
      });

      await tx.auditLog.create({
        data: {
          actorUserId: session.user.id,
          tenantId: stored.tenantId,
          action: "proof_session.completed",
          entityType: "proof_session",
          entityId: stored.id,
          metadata: {
            scoringSource: result.source,
            overallScore: result.overallScore,
            points: result.points
          }
        }
      });

      return next;
    });

    return {
      session: this.serializeProofSession(updated)
    };
  }

  async listProofSessions(token: string | undefined): Promise<ProofSessionListResponse> {
    const session = await this.requireStudentSession(token);
    const sessions = await this.prisma.proofSession.findMany({
      where: {
        userId: session.user.id
      },
      include: {
        career: {
          include: {
            category: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return {
      sessions: sessions.map((item) => this.serializeProofSession(item))
    };
  }

  async getProofSession(token: string | undefined, sessionId: string): Promise<ProofSessionResponse> {
    const session = await this.requireStudentSession(token);
    const stored = await this.prisma.proofSession.findFirst({
      where: {
        id: sessionId,
        userId: session.user.id
      },
      include: {
        career: {
          include: {
            category: true
          }
        }
      }
    });

    if (!stored) {
      throw new NotFoundException("Proof session not found.");
    }

    return {
      session: this.serializeProofSession(stored)
    };
  }

  async generateQuestionsFromProfile(token: string | undefined): Promise<GenerateQuestionsResponse> {
    const session = await this.requireStudentSession(token);
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId: session.user.id },
      include: { versions: { orderBy: { createdAt: "desc" } } }
    });

    if (!profile) {
      throw new BadRequestException("A student profile is required first.");
    }

    const hasContent =
      this.fromJsonArray(profile.favoriteSubjects).length > 0 ||
      this.fromJsonArray(profile.favoriteActivities).length > 0 ||
      this.fromJsonArray(profile.personalStrengths).length > 0;

    if (!hasContent) {
      throw new BadRequestException("Please fill in at least your favorite subjects, activities, or strengths before generating questions.");
    }

    // Return cached questions if available
    const cached = this.readQuestionSetFromCache(profile.assessmentQuestionsJson);
    if (cached) {
      console.log("Returning cached questions");
      return { questionSet: cached };
    }

    const questionSet = await this.generateProfileBasedQuestions(profile);

    // Cache the generated questions
    await this.prisma.studentProfile.update({
      where: { id: profile.id },
      data: { assessmentQuestionsJson: questionSet as unknown as Prisma.InputJsonValue }
    });

    return { questionSet };
  }

  private readQuestionSetFromCache(value: Prisma.JsonValue | null | undefined): ProofQuestionSet | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const raw = value as Record<string, unknown>;
    if (!Array.isArray(raw.questions) || raw.questions.length === 0) return null;
    return this.readQuestionSet(value);
  }

  async scoreProfileAssessment(
    token: string | undefined,
    questions: ProofQuestion[],
    answers: ProofAnswerInput[]
  ): Promise<SubmitProfileAssessmentResponse> {
    const session = await this.requireStudentSession(token);

    if (answers.length !== questions.length) {
      throw new BadRequestException("All questions must be answered.");
    }

    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId: session.user.id },
      include: { versions: { orderBy: { createdAt: "desc" } } }
    });

    const scoreScale = [20, 45, 75, 95];
    const dimensionScores: Record<string, number[]> = {};

    questions.forEach((question) => {
      const answer = answers.find((item) => item.questionId === question.id);
      const index = Math.max(0, Math.min(answer?.optionIndex ?? 1, 3));

      if (!dimensionScores[question.dimension]) {
        dimensionScores[question.dimension] = [];
      }

      dimensionScores[question.dimension].push(scoreScale[index]);
    });

    const normalizedDimensionScores = Object.entries(dimensionScores).reduce<Record<string, number>>(
      (scores, [key, values]) => {
        scores[key] = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
        return scores;
      },
      {}
    );

    const allScores = Object.values(normalizedDimensionScores);
    const overallScore = Math.round(allScores.reduce((sum, value) => sum + value, 0) / Math.max(allScores.length, 1));
    const readinessBand =
      overallScore >= 82
        ? "Strong readiness"
        : overallScore >= 65
          ? "Promising readiness"
          : overallScore >= 48
            ? "Developing readiness"
            : "Low readiness";

    const ranked = Object.entries(normalizedDimensionScores).sort((left, right) => right[1] - left[1]);
    const strengths = ranked.filter(([, s]) => s >= 65).map(([d]) => this.labelize(d));
    const risks = ranked.filter(([, s]) => s < 65).map(([d]) => this.labelize(d));

    const dimKeys = Object.keys(normalizedDimensionScores);
    const profileSubjects = profile ? this.fromJsonArray(profile.favoriteSubjects).join(", ") : "";
    const profileStrengths = profile ? this.fromJsonArray(profile.personalStrengths).join(", ") : "";
    const profileDislikes = profile ? this.fromJsonArray(profile.avoidsOrDislikes).join(", ") : "";

    const answerSummary = answers.map((a) => {
      const q = questions.find((qu) => qu.id === a.questionId);
      return `${q?.dimension}: "${q?.options[a.optionIndex]}"`;
    }).join("; ");

    const aiResult = await this.llmService.generateStructuredJson<{
      narrative: string;
      detailedReadout: string[];
      dimensions: Array<{ dimension: string; description: string }>;
    }>({
      systemInstruction: "You are a student character profiler. Be honest, specific, encouraging. Return only valid JSON.",
      prompt: `Analyze ${session.user.fullName}'s assessment. Score: ${overallScore}/100 (${readinessBand}).
Likes: ${profileSubjects}. Strengths: ${profileStrengths}. Avoids: ${profileDislikes}.
Scores: ${dimKeys.map((d) => `${d}=${normalizedDimensionScores[d]}%`).join(", ")}.
Answers: ${answerSummary}.

Return JSON: {"narrative":"2-3 sentences about ${session.user.fullName} mentioning their interests","detailedReadout":["2-4 specific observations"],"dimensions":[${dimKeys.map((d) => `{"dimension":"${d}","description":"1 sentence for this student"}`).join(",")}]}`,
      schema: {},
      temperature: 0.7
    }).catch((err) => {
      console.error("LLM scoring call failed:", err?.message || err);
      return null;
    });

    const dimensionDetails: DimensionDetail[] = Object.entries(normalizedDimensionScores).map(([dim, score]) => {
      const dimLower = dim.toLowerCase().replace(/[\s_-]+/g, "");
      const aiDim = aiResult?.dimensions?.find(
        (d) => d.dimension.toLowerCase().replace(/[\s_-]+/g, "") === dimLower
      );
      return {
        dimension: this.labelize(dim),
        score,
        description: aiDim?.description || `Scored ${score}% in ${this.labelize(dim)}.`,
        type: score >= 65 ? "dominant" as const : "caution" as const
      };
    });

    const result: ProfileAssessmentResult = {
      overallScore,
      readinessBand,
      dimensionScores: normalizedDimensionScores,
      dimensions: dimensionDetails,
      strengths,
      risks,
      narrative: aiResult?.narrative
        || `${session.user.fullName} shows ${readinessBand.toLowerCase()}. Strongest areas: ${strengths.slice(0, 2).join(" and ") || "developing"}. Areas to grow: ${risks.slice(0, 2).join(" and ") || "none identified"}.`,
      detailedReadout: aiResult?.detailedReadout
        || [`May benefit from focused practice in ${risks[0] || "consistency"}.`],
      nextSteps: [
        `Practice a weekly habit that improves ${risks[0] || "consistency"}.`,
        `Keep building on ${strengths[0] || "discipline"} through real responsibilities.`,
        "Explore careers that match your strengths and retake this assessment after growth."
      ]
    };

    // Cache the result on the profile
    const profileForCache = await this.prisma.studentProfile.findUnique({ where: { userId: session.user.id } });
    if (profileForCache) {
      await this.prisma.studentProfile.update({
        where: { id: profileForCache.id },
        data: { assessmentResultJson: result as unknown as Prisma.InputJsonValue }
      });
    }

    return { result };
  }

  private async generateProfileBasedQuestions(profile: ProfileRecord): Promise<ProofQuestionSet> {
    const fallback = this.buildFallbackProfileQuestionSet();

    console.log("LLM isConfigured:", this.llmService.isConfigured());

    const subjects = this.fromJsonArray(profile.favoriteSubjects).join(", ");
    const activities = this.fromJsonArray(profile.favoriteActivities).join(", ");
    const strengths = this.fromJsonArray(profile.personalStrengths).join(", ");
    const dislikes = this.fromJsonArray(profile.avoidsOrDislikes).join(", ");
    const curious = this.fromJsonArray(profile.topicsCuriousAbout).join(", ");

    const aiResponse = await this.llmService.generateStructuredJson<ProofQuestionSet>({
      systemInstruction: "You generate behavioral assessment questions for students. Return only valid JSON.",
      prompt: `Generate ${proofQuestionCount} behavioral questions for a grade ${profile.gradeLevel || "unknown"} student (age ${profile.ageBand || "unknown"}).
Profile: likes ${subjects || "various subjects"}, enjoys ${activities || "various activities"}, curious about ${curious || "many things"}, strengths: ${strengths || "developing"}, avoids: ${dislikes || "nothing specific"}.
Each question tests mindset, behavior, or emotional readiness — not trivia. 4 options each ,all looks similar but should test the user mindset..

Return JSON: {"source":"gemini","introduction":"...","questions":[{"id":"q1","dimension":"one word like discipline","question":"...","whyItMatters":"...","options":["looks similar","...","...","test the user mindset"]}]}
Exactly ${proofQuestionCount} questions.`,
      schema: {},
      temperature: 0.8
    }).catch((err) => {
      console.error("LLM question generation failed:", err?.message || err);
      return null;
    });

    if (!aiResponse?.questions?.length) {
      console.warn("No AI questions returned, using fallback");
      return fallback;
    }

    return {
      source: "gemini",
      introduction: aiResponse.introduction,
      questions: aiResponse.questions.slice(0, proofQuestionCount)
    };
  }

  private buildFallbackProfileQuestionSet(): ProofQuestionSet {
    const questionTemplates: Array<Omit<ProofQuestion, "id">> = [
      {
        dimension: "discipline",
        question: "If you had to follow a strict daily routine for 60 days with no breaks, how would you handle it?",
        whyItMatters: "Long-term consistency matters more than short bursts of excitement.",
        options: [
          "I would lose interest quickly and stop following it.",
          "I could try but would need someone pushing me constantly.",
          "I would mostly stay on track with occasional support.",
          "I can stay disciplined even when the routine becomes boring."
        ]
      },
      {
        dimension: "independence",
        question: "How comfortable are you working on something important entirely on your own, without guidance?",
        whyItMatters: "Independence is key to handling real-world responsibilities.",
        options: [
          "I struggle without clear instructions from someone.",
          "I can manage simple tasks but need help with anything complex.",
          "I can figure most things out if I have time to think.",
          "I am comfortable leading myself through unfamiliar challenges."
        ]
      },
      {
        dimension: "pressure",
        question: "When the stakes are high and mistakes have consequences, what happens to your focus?",
        whyItMatters: "Handling pressure calmly is essential for any serious responsibility.",
        options: [
          "I freeze or avoid the situation entirely.",
          "I get overwhelmed and need someone else to take charge.",
          "I feel the pressure but can still think and act carefully.",
          "Pressure sharpens my focus and makes me more deliberate."
        ]
      },
      {
        dimension: "adaptability",
        question: "If your plan suddenly fell apart and you had to improvise, how would you respond?",
        whyItMatters: "Adaptability determines how well you handle uncertainty.",
        options: [
          "I get frustrated and struggle to move forward.",
          "I need a long time before I can adjust to the change.",
          "I can adapt after a short reset and some thought.",
          "I adjust quickly and keep moving without losing composure."
        ]
      },
      {
        dimension: "communication",
        question: "If you had to explain a difficult situation to someone who was upset, what would you do?",
        whyItMatters: "Clear communication under stress is critical in real situations.",
        options: [
          "I would avoid the conversation if I could.",
          "I would speak but probably become defensive or unclear.",
          "I would stay respectful and explain the basics calmly.",
          "I would listen first, then explain clearly and thoughtfully."
        ]
      },
      {
        dimension: "service",
        question: "How willing are you to keep working when the task is uncomfortable or unrewarding?",
        whyItMatters: "Service mindset separates short-term excitement from real commitment.",
        options: [
          "I mostly stop when things become uncomfortable.",
          "I try but my motivation drops fast if it feels hard.",
          "I can continue if I remember why the work matters.",
          "I stay committed even when the work is tiring or thankless."
        ]
      },
      {
        dimension: "ethics",
        question: "If taking a shortcut would make your life easier but could quietly harm someone's trust, what would you do?",
        whyItMatters: "Ethical judgment matters in every part of life.",
        options: [
          "I would probably take the shortcut if no one noticed.",
          "I might take it if I was under enough pressure.",
          "I would hesitate and likely choose the harder but fair path.",
          "I would reject it and protect trust even at a cost to myself."
        ]
      },
      {
        dimension: "resilience",
        question: "After a disappointing failure, how do you typically respond in the following days?",
        whyItMatters: "Resilience determines whether setbacks become permanent or temporary.",
        options: [
          "I lose confidence and stop trying for a while.",
          "I doubt myself and slow down significantly.",
          "I reflect on what happened and try again with adjustments.",
          "I use the setback as feedback and come back stronger."
        ]
      }
    ];

    return {
      source: "fallback",
      introduction: "This behavioral assessment helps understand your readiness, mindset, and personal strengths based on your profile.",
      questions: questionTemplates.slice(0, proofQuestionCount).map((question, index) => ({
        id: `profile-assessment-${index + 1}`,
        ...question
      }))
    };
  }

  private async requireStudentSession(token: string | undefined): Promise<SessionRecord> {
    const session = await this.authService.getAuthenticatedSession(token);

    if (!session) {
      throw new UnauthorizedException("Authentication required.");
    }

    const activeMembership = session.user.memberships.find((membership) => membership.status === "active") || null;

    if (activeMembership?.role === MembershipRole.school_admin) {
      throw new ForbiddenException("Student access required.");
    }

    return session;
  }

  private async requireSubmittedProfile(userId: string): Promise<ProfileRecord> {
    const profile = await this.prisma.studentProfile.findUnique({
      where: {
        userId
      },
      include: {
        versions: {
          orderBy: {
            createdAt: "desc"
          }
        }
      }
    });

    if (!profile) {
      throw new BadRequestException("A student profile is required first.");
    }

    if (profile.completionStatus !== ProfileCompletionStatus.submitted) {
      throw new BadRequestException("Submit the student profile before starting proof sessions.");
    }

    return profile;
  }

  private async generateProofQuestionSet(career: CareerRecord, profile: ProfileRecord): Promise<ProofQuestionSet> {
    const fallback = this.buildFallbackProofQuestionSet(career);
    const aiResponse = await this.llmService.generateStructuredJson<ProofQuestionSet>({
      systemInstruction:
        "You generate safe, realistic career-readiness interview questions for students. Focus on behavior, independence, discipline, resilience, ethics, pressure tolerance, service mindset, communication, empathy, adaptability, and stamina where relevant. Never ask trivia or technical questions. Return only JSON.",
      prompt: [
        `Generate ${proofQuestionCount} tricky but student-safe proof questions for a career.`,
        "The student does not know the field technically, so do not ask factual or academic trivia.",
        "Each question must test capability, behavior, mindset, emotional readiness, or lifestyle fit.",
        "Every question must have exactly 4 answer options ,all looks similar but should test the user mindset.",
        `Career context: ${JSON.stringify({
          title: career.title,
          category: career.category.name,
          summary: career.summary,
          skills: this.fromJsonArray(career.detail?.skills),
          positives: this.fromJsonArray(career.detail?.positives),
          challenges: this.fromJsonArray(career.detail?.challenges),
          drawbacks: this.fromJsonArray(career.detail?.drawbacks)
        })}`,
        `Student profile context: ${JSON.stringify({
          favoriteSubjects: this.fromJsonArray(profile.favoriteSubjects),
          favoriteActivities: this.fromJsonArray(profile.favoriteActivities),
          topicsCuriousAbout: this.fromJsonArray(profile.topicsCuriousAbout),
          personalStrengths: this.fromJsonArray(profile.personalStrengths),
          avoidsOrDislikes: this.fromJsonArray(profile.avoidsOrDislikes)
        })}`
      ].join("\n"),
      schema: {
        type: "object",
        properties: {
          source: { type: "string" },
          introduction: { type: "string" },
          questions: {
            type: "array",
            minItems: proofQuestionCount,
            maxItems: proofQuestionCount,
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                dimension: { type: "string" },
                question: { type: "string" },
                whyItMatters: { type: "string" },
                options: {
                  type: "array",
                  minItems: 4,
                  maxItems: 4,
                  items: { type: "string" }
                }
              },
              required: ["id", "dimension", "question", "whyItMatters", "options"]
            }
          }
        },
        required: ["source", "introduction", "questions"]
      },
      temperature: 0.8
    }).catch(() => null);

    if (!aiResponse?.questions?.length) {
      return fallback;
    }

    return {
      source: "gemini",
      introduction: aiResponse.introduction,
      questions: aiResponse.questions.slice(0, proofQuestionCount)
    };
  }

  private async evaluateProofSession(
    career: CareerRecord,
    profile: ProfileRecord,
    questionSet: ProofQuestionSet,
    answers: ProofAnswerInput[]
  ): Promise<ProofResult> {
    const fallback = this.buildFallbackProofResult(questionSet, answers, career);
    const aiResponse = await this.llmService.generateStructuredJson<{
      source: string;
      narrative: string;
      parentSummary: string;
      schoolSummary: string;
      strengths: string[];
      risks: string[];
      nextSteps: string[];
    }>({
      systemInstruction:
        "You evaluate student career-readiness sessions for students, parents, and schools. Keep the tone honest, balanced, and practical. Do not change numeric scores. Return only JSON.",
      prompt: [
        "Create a student-safe narrative for a completed proof session.",
        `Career context: ${JSON.stringify({ title: career.title, category: career.category.name, summary: career.summary })}`,
        `Student profile: ${JSON.stringify({
          favoriteActivities: this.fromJsonArray(profile.favoriteActivities),
          topicsCuriousAbout: this.fromJsonArray(profile.topicsCuriousAbout),
          personalStrengths: this.fromJsonArray(profile.personalStrengths),
          avoidsOrDislikes: this.fromJsonArray(profile.avoidsOrDislikes)
        })}`,
        `Question set: ${JSON.stringify(questionSet)}`,
        `Answers: ${JSON.stringify(answers)}`,
        `Deterministic score report: ${JSON.stringify(fallback)}`
      ].join("\n"),
      schema: {
        type: "object",
        properties: {
          source: { type: "string" },
          narrative: { type: "string" },
          parentSummary: { type: "string" },
          schoolSummary: { type: "string" },
          strengths: {
            type: "array",
            items: { type: "string" }
          },
          risks: {
            type: "array",
            items: { type: "string" }
          },
          nextSteps: {
            type: "array",
            items: { type: "string" }
          }
        },
        required: ["source", "narrative", "parentSummary", "schoolSummary", "strengths", "risks", "nextSteps"]
      },
      temperature: 0.6
    }).catch(() => null);

    return aiResponse
      ? {
        ...fallback,
        source: "gemini",
        narrative: aiResponse.narrative,
        parentSummary: aiResponse.parentSummary,
        schoolSummary: aiResponse.schoolSummary,
        strengths: aiResponse.strengths.slice(0, 3),
        risks: aiResponse.risks.slice(0, 3),
        nextSteps: aiResponse.nextSteps.slice(0, 3)
      }
      : fallback;
  }

  private buildFallbackProofQuestionSet(career: CareerRecord): ProofQuestionSet {
    const challengeText = this.fromJsonArray(career.detail?.challenges).join(" ");
    const isHighDisciplineCareer = /discipline|pressure|responsibility|service|stamina/i.test(challengeText + career.title);

    const questionTemplates: Array<Omit<ProofQuestion, "id">> = [
      {
        dimension: "discipline",
        question: `If ${career.title} required you to follow a strict routine for 60 days, how likely are you to stay consistent without someone forcing you?`,
        whyItMatters: "Long-term consistency matters more than excitement in demanding career paths.",
        options: [
          "I would lose interest quickly and break the routine.",
          "I could try for a while but would need frequent pushing.",
          "I would mostly stay on track with some occasional support.",
          "I can stay disciplined even when the routine becomes repetitive."
        ]
      },
      {
        dimension: "independence",
        question: `How comfortable are you staying away from your usual family support for several days if the career demanded training, travel, or field work?`,
        whyItMatters: "Many careers require independence, relocation, or time away from home comfort.",
        options: [
          "I would not handle that well at all.",
          "I could manage briefly but would struggle emotionally.",
          "I could adapt if I understood the purpose and had time to prepare.",
          "I can stay steady and focused even when I am away from familiar support."
        ]
      },
      {
        dimension: "pressure",
        question: `When responsibility becomes heavy and mistakes matter, what usually happens to your focus?`,
        whyItMatters: "High-stakes roles require calm judgment under pressure.",
        options: [
          "I freeze or avoid the situation.",
          "I get overwhelmed and need someone else to take over.",
          "I feel pressure but can still recover and act carefully.",
          "Pressure sharpens my focus and makes me more deliberate."
        ]
      },
      {
        dimension: "adaptability",
        question: `If the day changed suddenly and your plan was no longer useful, how would you respond?`,
        whyItMatters: "Career readiness depends on handling uncertainty without collapsing.",
        options: [
          "I get frustrated and stop performing well.",
          "I need a lot of time before I can adjust.",
          "I can adapt after a short reset.",
          "I adjust quickly and keep moving without losing composure."
        ]
      },
      {
        dimension: "communication",
        question: `If you had to explain a difficult situation clearly to someone upset, what would you most likely do?`,
        whyItMatters: "Clear communication under stress is critical in real work environments.",
        options: [
          "I would avoid the conversation if possible.",
          "I would speak, but probably become defensive or unclear.",
          "I would stay respectful and explain the basics calmly.",
          "I would listen first, then explain clearly and thoughtfully."
        ]
      },
      {
        dimension: "service",
        question: `How willing are you to keep going when the work matters, even if it is uncomfortable, tiring, or not immediately rewarding?`,
        whyItMatters: "Service mindset separates short-term excitement from genuine commitment.",
        options: [
          "I mostly stop when the work becomes uncomfortable.",
          "I try, but my motivation drops quickly if it feels hard.",
          "I can continue if I remember why the work matters.",
          "I stay committed even when the work becomes inconvenient or tiring."
        ]
      },
      {
        dimension: "ethics",
        question: `If a shortcut made your work easier but could quietly harm trust or fairness, what would you do?`,
        whyItMatters: "Ethical judgment matters in any profession with real consequences.",
        options: [
          "I would probably take the shortcut if no one noticed.",
          "I might take it if the pressure was high.",
          "I would hesitate and likely choose the safer path.",
          "I would reject it and protect trust even if it cost me time."
        ]
      },
      {
        dimension: isHighDisciplineCareer ? "stamina" : "resilience",
        question: isHighDisciplineCareer
          ? `If ${career.title} demanded long hours, repeated effort, or physical and mental fatigue, how would you usually respond?`
          : `If progress in ${career.title} was slower than expected, how would you respond after a disappointing week?`,
        whyItMatters: isHighDisciplineCareer
          ? "Some careers require sustained stamina when conditions are not easy."
          : "Resilience matters when results are delayed and motivation is tested.",
        options: isHighDisciplineCareer
          ? [
            "I would shut down quickly and want to quit.",
            "I could push a little, but not for long.",
            "I could stay steady with recovery and support.",
            "I can keep performing even when the work becomes very demanding."
          ]
          : [
            "I would lose confidence and stop trying.",
            "I would doubt myself for a while and slow down.",
            "I would reflect, recover, and try again.",
            "I would use the setback as feedback and come back stronger."
          ]
      }
    ];

    return {
      source: "fallback",
      introduction: `This 8-question proof session checks whether your behavior, mindset, and readiness fit the real demands of ${career.title}.`,
      questions: questionTemplates.slice(0, proofQuestionCount).map((question, index) => ({
        id: `proof-${career.slug}-${index + 1}`,
        ...question
      }))
    };
  }

  private buildFallbackProofResult(
    questionSet: ProofQuestionSet,
    answers: ProofAnswerInput[],
    career: CareerRecord
  ): ProofResult {
    const scoreScale = [20, 45, 75, 95];
    const dimensionScores: Record<string, number[]> = {};

    questionSet.questions.forEach((question) => {
      const answer = answers.find((item) => item.questionId === question.id);
      const index = Math.max(0, Math.min(answer?.optionIndex ?? 1, 3));

      if (!dimensionScores[question.dimension]) {
        dimensionScores[question.dimension] = [];
      }

      dimensionScores[question.dimension].push(scoreScale[index]);
    });

    const normalizedDimensionScores = Object.entries(dimensionScores).reduce<Record<string, number>>((scores, [key, values]) => {
      scores[key] = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
      return scores;
    }, {});

    const allScores = Object.values(normalizedDimensionScores);
    const overallScore = Math.round(allScores.reduce((sum, value) => sum + value, 0) / Math.max(allScores.length, 1));
    const points = overallScore * 10;
    const readinessBand =
      overallScore >= 82
        ? "Strong readiness"
        : overallScore >= 65
          ? "Promising readiness"
          : overallScore >= 48
            ? "Developing readiness"
            : "Low readiness";
    const ranked = Object.entries(normalizedDimensionScores).sort((left, right) => right[1] - left[1]);
    const strengths = ranked.slice(0, 3).map(([dimension]) => this.labelize(dimension));
    const risks = ranked.slice(-3).map(([dimension]) => this.labelize(dimension));

    return {
      source: "fallback",
      overallScore,
      points,
      readinessBand,
      dimensionScores: normalizedDimensionScores,
      strengths,
      risks,
      narrative: `Your current proof result for ${career.title} suggests ${readinessBand.toLowerCase()}. The strongest evidence appears in ${strengths
        .slice(0, 2)
        .join(" and ")}, while ${risks[0] || "consistency"} still needs work.`,
      parentSummary: `${career.title} proof readiness is currently ${overallScore}%. The biggest strengths are ${strengths
        .slice(0, 2)
        .join(" and ")}, while ${risks[0] || "consistency"} needs support.`,
      schoolSummary: `The student earned ${points} proof points for ${career.title}. Suggested support areas: ${risks
        .slice(0, 2)
        .join(" and ") || "consistency"}.`,
      nextSteps: [
        `Practice a weekly habit that improves ${risks[0] || "consistency"}.`,
        `Keep building on ${strengths[0] || "discipline"} through real responsibilities.`,
        "Repeat this proof session after more deliberate practice."
      ]
    };
  }

  private serializeProofSession(session: ProofSessionWithCareer | ProofSessionModel & { career: { id: string; slug: string; title: string; summary: string; category: { id: string; slug: string; name: string } } }): ProofSessionRecord {
    const questionSet = this.readQuestionSet(session.questionSetJson);
    const answerCount = Array.isArray(session.answerSetJson) ? session.answerSetJson.length : 0;
    const result = this.readProofResult(session.resultJson);

    return {
      id: session.id,
      status: session.status,
      questionSource: session.questionSource,
      scoringSource: session.scoringSource || null,
      questionSetVersion: session.questionSetVersion,
      startedAt: session.startedAt.toISOString(),
      completedAt: session.completedAt?.toISOString() || null,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
      career: {
        id: session.career.id,
        slug: session.career.slug,
        name: session.career.category.name,
        title: session.career.title,
        summary: session.career.summary
      },
      questionSet,
      answerCount,
      result
    };
  }

  private readQuestionSet(value: Prisma.JsonValue): ProofQuestionSet {
    const raw = (value || {}) as Record<string, unknown>;
    const rawQuestions = Array.isArray(raw.questions) ? raw.questions : [];

    return {
      source: String(raw.source || "fallback"),
      introduction: String(raw.introduction || ""),
      questions: rawQuestions.map((question, index) => {
        const item = question as Record<string, unknown>;
        return {
          id: String(item.id || `proof-question-${index + 1}`),
          dimension: String(item.dimension || "general"),
          question: String(item.question || ""),
          whyItMatters: String(item.whyItMatters || ""),
          options: Array.isArray(item.options) ? item.options.map((option) => String(option)) : []
        };
      })
    };
  }

  private readProofResult(value: Prisma.JsonValue | null | undefined): ProofResult | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return null;
    }

    const raw = value as Record<string, unknown>;
    const dimensionScoresRaw =
      raw.dimensionScores && typeof raw.dimensionScores === "object" && !Array.isArray(raw.dimensionScores)
        ? (raw.dimensionScores as Record<string, unknown>)
        : {};

    return {
      source: String(raw.source || "fallback"),
      overallScore: Number(raw.overallScore || 0),
      points: Number(raw.points || 0),
      readinessBand: String(raw.readinessBand || ""),
      dimensionScores: Object.fromEntries(
        Object.entries(dimensionScoresRaw).map(([key, item]) => [key, Number(item || 0)])
      ),
      strengths: Array.isArray(raw.strengths) ? raw.strengths.map((item) => String(item)) : [],
      risks: Array.isArray(raw.risks) ? raw.risks.map((item) => String(item)) : [],
      narrative: String(raw.narrative || ""),
      parentSummary: String(raw.parentSummary || ""),
      schoolSummary: String(raw.schoolSummary || ""),
      nextSteps: Array.isArray(raw.nextSteps) ? raw.nextSteps.map((item) => String(item)) : []
    };
  }

  private fromJsonArray(value: Prisma.JsonValue | null | undefined): string[] {
    return Array.isArray(value) ? value.map((item) => String(item)) : [];
  }

  private labelize(value: string): string {
    return value
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (character) => character.toUpperCase());
  }
}
