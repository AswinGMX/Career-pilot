import type { Career, Recommendation, StudentDashboardResponse } from "@/features/dashboard/types";
import type { AuthUser, TenantSummary } from "@/shared/types";

export interface SchoolStudentCard {
  student: AuthUser;
  profileCompleted: boolean;
  topRecommendation: Recommendation | null;
  latestProof: {
    id: string;
    careerId: string;
    careerTitle: string;
    careerCategory: string;
    points: number;
    overallScore: number;
    readinessBand: string;
    completedAt: string;
  } | null;
  totalPoints: number;
}

export interface SchoolOverviewResponse {
  tenant: TenantSummary;
  stats: {
    totalStudents: number;
    completedProfiles: number;
    proofCount: number;
    totalPoints: number;
  };
  students: SchoolStudentCard[];
}

export interface AdminOverviewAttentionStudent {
  studentId: string;
  fullName: string;
  grade: string;
  statusLabel: string;
  statusTone: "danger" | "warning" | "info";
  note: string;
  topRecommendationTitle: string | null;
}

export interface AdminOverviewRecentProofActivity {
  studentId: string;
  fullName: string;
  grade: string;
  careerTitle: string;
  points: number;
  overallScore: number;
  readinessBand: string;
  completedAt: string;
  readinessTone: "success" | "warning" | "danger";
}

export interface AdminOverviewTopStudent {
  studentId: string;
  fullName: string;
  grade: string;
  totalPoints: number;
  latestProofTitle: string | null;
  topRecommendationTitle: string | null;
  profileCompleted: boolean;
}

export interface AdminOverviewDashboard {
  helperText: string;
  profileCompletionRate: number;
  studentsPendingProfile: number;
  studentsWithoutProof: number;
  studentsWithProof: number;
  averageProofPoints: number;
  priorityHeadline: string;
  priorityDescription: string;
  recommendationSpotlight: {
    title: string;
    count: number;
  } | null;
  topStudents: AdminOverviewTopStudent[];
  recentProofActivity: AdminOverviewRecentProofActivity[];
  attentionStudents: AdminOverviewAttentionStudent[];
}

export interface CreateSchoolStudentPayload {
  fullName: string;
  email: string;
  grade: string;
  password: string;
}

export interface AdminStudentReportPayload extends StudentDashboardResponse {}

export interface AdminCareerLibraryState {
  careers: Career[];
  selectedCareer: Career | null;
}
