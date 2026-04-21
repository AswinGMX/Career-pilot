import type { AuthUser } from "@/shared/types";

export interface Recommendation {
  id: string;
  title: string;
  category: string;
  summary: string;
  fitScore: number;
  reasons: string[];
  crisisResilience: number;
  salaryProgressionLakhsINR: Record<string, number>;
}

export interface InterestSignal {
  tag: string;
  score: number;
  reason: string;
}

export interface ProfileAnalysis {
  source: string;
  summary: string;
  characterReadout: string;
  dominantTraits: string[];
  cautionAreas: string[];
  workPreferences: string[];
  personalityScores: Record<string, number>;
  interestSignals: InterestSignal[];
}

export interface StudentProfile {
  id: string;
  createdAt: string;
  userId: string;
  basicInfo: ProfileFormValues;
  questionSet: ProfileQuestionSet;
  answers: QuestionAnswer[];
  analysis: ProfileAnalysis;
  updatedAt: string;
}

export interface Career {
  id: string;
  title: string;
  category: string;
  summary: string;
  trainingRoute: string;
  practiceRoute: string;
  demandTags: string[];
  interestTags: string[];
  positives: string[];
  challenges: string[];
  negatives: string[];
  howToBecome: string[];
  realWorldReality: {
    workSettings: string;
  };
  futureOutlook: {
    demandScore: number;
    automationRisk: number;
  };
  crisisResilience: {
    score: number;
    label: string;
    explanation: string;
  };
  salaryProgressionLakhsINR: Record<string, number>;
  fitScore?: number;
  reasons?: string[];
}

export interface Question {
  id: string;
  dimension: string;
  question: string;
  whyItMatters?: string;
  options: string[];
}

export interface ProfileQuestionSet {
  source: string;
  questions: Question[];
}

export interface ProofQuestionSet {
  source: string;
  introduction: string;
  questions: Question[];
}

export interface QuestionAnswer {
  questionId: string;
  optionIndex: number;
}

export interface ProofEvaluation {
  source: string;
  overallScore: number;
  points: number;
  readinessBand: string;
  dimensionScores: Record<string, number>;
  strengths: string[];
  risks: string[];
  narrative: string;
  parentSummary: string;
  schoolSummary: string;
  nextSteps: string[];
}

export interface ProofSession {
  id: string;
  createdAt: string;
  userId: string;
  careerId: string;
  careerTitle: string;
  careerCategory: string;
  status: string;
  questionSet: ProofQuestionSet;
  answers: QuestionAnswer[];
  evaluation?: ProofEvaluation;
  completedAt?: string;
}

export interface StudentDashboardResponse {
  student: AuthUser;
  profile: StudentProfile | null;
  recommendations: Recommendation[];
  proofSessions: ProofSession[];
  totalPoints: number;
}

export interface CareerLibraryResponse {
  careers: Career[];
  total: number;
  allCareerCount: number;
}

export interface ProfileFormValues {
  ageRange: string;
  grade: string;
  favoriteSubjects: string;
  favoriteActivities: string;
  topicsCuriousAbout: string;
  personalStrengths: string;
  avoidsOrDislikes: string;
}
