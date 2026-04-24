export interface HealthResponse {
  ok: boolean;
  service: string;
}

export type RegisterAccountType = "individual" | "school_admin" | "school_student";
export type UserAccountType = "individual" | "tenant_member";
export type UserStatus = "active" | "invited" | "disabled";
export type MembershipRole = "school_admin" | "student" | "parent_viewer";
export type MembershipStatus = "active" | "revoked";
export type TenantType = "school";
export type TenantStatus = "active" | "suspended";

export interface SessionTenantSummary {
  id: string;
  name: string;
  slug: string;
  type: TenantType;
  status: TenantStatus;
}

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  accountType: UserAccountType;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SessionMembership {
  id: string;
  role: MembershipRole;
  status: MembershipStatus;
  tenant: SessionTenantSummary;
}

export interface AuthSessionPayload {
  user: SessionUser;
  activeMembership: SessionMembership | null;
  permissions: string[];
}

export interface AuthMeResponse {
  authenticated: boolean;
  session: AuthSessionPayload | null;
}

export interface RegisterPayload {
  accountType: RegisterAccountType;
  fullName: string;
  email: string;
  password: string;
  schoolName?: string;
  tenantSlug?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

export interface PasswordResetResponse {
  ok: boolean;
  message: string;
  resetToken?: string;
}

export interface TenantDetailResponse {
  tenant: SessionTenantSummary;
}

export interface TenantMemberSummary {
  id: string;
  fullName: string;
  email: string;
  accountType: UserAccountType;
  status: UserStatus;
  membershipRole: MembershipRole;
  membershipStatus: MembershipStatus;
  joinedAt: string;
}

export interface TenantMembersResponse {
  tenant: SessionTenantSummary;
  members: TenantMemberSummary[];
}

export type ProfileCompletionStatus = "draft" | "submitted";

export interface StudentProfile {
  id: string;
  userId: string;
  tenantId: string | null;
  gradeLevel: string | null;
  ageBand: string | null;
  favoriteSubjects: string[];
  favoriteActivities: string[];
  topicsCuriousAbout: string[];
  personalStrengths: string[];
  avoidsOrDislikes: string[];
  completionStatus: ProfileCompletionStatus;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  versionCount: number;
  cachedAssessmentResult: ProfileAssessmentResult | null;
}

export interface StudentProfileResponse {
  profile: StudentProfile | null;
}

export interface ProfileUpdatePayload {
  gradeLevel?: string;
  ageBand?: string;
  favoriteSubjects: string[];
  favoriteActivities: string[];
  topicsCuriousAbout: string[];
  personalStrengths: string[];
  avoidsOrDislikes: string[];
}

export interface ProfileSubmitResponse {
  ok: boolean;
  profile: StudentProfile;
}

export interface CareerCategorySummary {
  id: string;
  slug: string;
  name: string;
  count: number;
}

export interface CareerCategoryRef {
  id: string;
  slug: string;
  name: string;
}

export interface CareerRecord {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: CareerCategoryRef;
  educationPath: string[];
  skills: string[];
  positives: string[];
  challenges: string[];
  drawbacks: string[];
  salaryMeta: Record<string, unknown>;
  outlookMeta: Record<string, unknown>;
  resilienceMeta: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CareerCategoriesResponse {
  categories: CareerCategorySummary[];
}

export interface CareerListResponse {
  items: CareerRecord[];
  page: number;
  pageSize: number;
  total: number;
}

export interface CareerDetailResponse {
  career: CareerRecord;
}

export interface RecommendationItem {
  rank: number;
  fitScore: number;
  fitLabel: "high" | "medium" | "emerging";
  explanation: string;
  reasons: string[];
  evidenceInputs: string[];
  engineVersion: string;
  career: CareerRecord;
}

export interface RecommendationSnapshot {
  id: string;
  userId: string;
  studentProfileId: string;
  profileVersionCount: number;
  engineVersion: string;
  inputSummary: string[];
  createdAt: string;
  items: RecommendationItem[];
}

export interface RecommendationLatestResponse {
  snapshot: RecommendationSnapshot | null;
}

export interface RecommendationRecomputeResponse {
  ok: boolean;
  snapshot: RecommendationSnapshot;
}

export interface ProofQuestion {
  id: string;
  dimension: string;
  question: string;
  whyItMatters: string;
  options: string[];
}

export interface ProofQuestionSet {
  source: string;
  introduction: string;
  questions: ProofQuestion[];
}

export interface ProofAnswerInput {
  questionId: string;
  optionIndex: number;
}

export interface ProofResult {
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

export interface ProofSessionRecord {
  id: string;
  status: "in_progress" | "completed";
  questionSource: string;
  scoringSource: string | null;
  questionSetVersion: string;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  career: CareerCategoryRef & {
    title: string;
    summary: string;
  };
  questionSet: ProofQuestionSet;
  answerCount: number;
  result: ProofResult | null;
}

export interface ProofSessionStartPayload {
  careerSlug: string;
}

export interface ProofSessionAnswerPayload {
  answers: ProofAnswerInput[];
}

export interface ProofSessionResponse {
  session: ProofSessionRecord;
}

export interface ProofSessionListResponse {
  sessions: ProofSessionRecord[];
}

export interface SchoolStudentSummary {
  id: string;
  fullName: string;
  email: string;
  joinedAt: string;
  profileCompletionStatus: ProfileCompletionStatus | null;
  recommendationStatus: "ready" | "missing";
  latestRecommendationCreatedAt: string | null;
  topRecommendationTitle: string | null;
  completedProofSessions: number;
  latestProofReadinessBand: string | null;
}

export interface SchoolStudentsResponse {
  tenant: SessionTenantSummary;
  page: number;
  pageSize: number;
  total: number;
  students: SchoolStudentSummary[];
}

export interface SchoolStudentDetail {
  student: {
    id: string;
    fullName: string;
    email: string;
    joinedAt: string;
  };
  profile: StudentProfile | null;
  latestRecommendation: RecommendationSnapshot | null;
  proofSessions: ProofSessionRecord[];
}

export interface SchoolStudentDetailResponse {
  tenant: SessionTenantSummary;
  report: SchoolStudentDetail;
}

export interface SchoolStudentCreatePayload {
  fullName: string;
  email: string;
  password: string;
}

export interface SchoolStudentCreateResponse {
  tenant: SessionTenantSummary;
  student: TenantMemberSummary;
}

export type ReportType = "student" | "school";
export type ReportStatus = "queued" | "ready" | "failed";

export interface ParentShareSummary {
  id: string;
  reportId: string;
  publicUrl: string | null;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
  isActive: boolean;
}

export interface StudentDurableReportPayload {
  generatedAt: string;
  student: {
    id: string;
    fullName: string;
    email: string;
    joinedAt: string;
  };
  profileCompletionStatus: ProfileCompletionStatus | null;
  topRecommendationTitle: string | null;
  recommendationCreatedAt: string | null;
  recommendationHighlights: string[];
  proofReadinessBand: string | null;
  proofConfidenceScore: number | null;
  parentSummary: string | null;
  schoolSummary: string | null;
  strengths: string[];
  risks: string[];
  nextSteps: string[];
}

export interface SchoolDurableReportPayload {
  generatedAt: string;
  tenant: SessionTenantSummary;
  totals: {
    students: number;
    profilesSubmitted: number;
    recommendationsReady: number;
    proofSessionsCompleted: number;
  };
  readinessBandBreakdown: Record<string, number>;
  topCareerTitles: string[];
  studentsNeedingAttention: Array<{
    id: string;
    fullName: string;
    reason: string;
  }>;
}

export interface StudentReportRecord {
  id: string;
  reportType: "student";
  status: ReportStatus;
  version: string;
  fileUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  report: StudentDurableReportPayload | null;
  shares: ParentShareSummary[];
}

export interface SchoolReportRecord {
  id: string;
  reportType: "school";
  status: ReportStatus;
  version: string;
  fileUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  report: SchoolDurableReportPayload | null;
}

export interface StudentLatestReportResponse {
  report: StudentReportRecord | null;
}

export interface StudentGenerateReportResponse {
  ok: boolean;
  report: StudentReportRecord;
}

export interface StudentShareCreatePayload {
  expiresInDays?: number;
}

export interface StudentShareCreateResponse {
  ok: boolean;
  share: ParentShareSummary;
}

export interface StudentShareRevokeResponse {
  ok: boolean;
  share: ParentShareSummary;
}

export interface ParentSharedReportResponse {
  share: ParentShareSummary;
  report: StudentReportRecord;
}

export interface SchoolLatestReportResponse {
  tenant: SessionTenantSummary;
  report: SchoolReportRecord | null;
}

export interface SchoolGenerateReportResponse {
  ok: boolean;
  tenant: SessionTenantSummary;
  report: SchoolReportRecord;
}

export interface GenerateQuestionsResponse {
  questionSet: ProofQuestionSet;
}

export interface DimensionDetail {
  dimension: string;
  score: number;
  description: string;
  type: "dominant" | "caution";
}

export interface ProfileAssessmentResult {
  overallScore: number;
  readinessBand: string;
  dimensionScores: Record<string, number>;
  dimensions: DimensionDetail[];
  strengths: string[];
  risks: string[];
  narrative: string;
  detailedReadout: string[];
  nextSteps: string[];
}

export interface SubmitProfileAssessmentPayload {
  questions: ProofQuestion[];
  answers: ProofAnswerInput[];
}

export interface SubmitProfileAssessmentResponse {
  result: ProfileAssessmentResult;
}

export type McqSource = "gemini" | "cache" | "fallback";

export interface McqOptionPayload {
  letter: string;
  orderIndex: number;
  text: string;
  isCorrect: boolean;
}

export interface McqItemPayload {
  id: string;
  orderIndex: number;
  tag: string;
  difficulty: number;
  stem: string;
  explanation: string;
  correctLetter: string;
  options: McqOptionPayload[];
}

export interface McqSetMeta {
  id: string;
  source: McqSource;
  subject: string;
  grade: number;
  level: number;
  count: number;
  audience: string;
  weakTopics: string;
  createdAt: string;
}

export interface McqSetResponse {
  set: McqSetMeta;
  items: McqItemPayload[];
}

export interface McqGeneratePayload {
  subject: string;
  count?: number;
}

export interface McqSetsListResponse {
  sets: McqSetMeta[];
}
