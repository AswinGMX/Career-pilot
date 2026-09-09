export type HealthCheckState = "up" | "down";

export interface HealthResponse {
  ok: boolean;
  service: string;
  checks?: {
    database: HealthCheckState;
    redis: HealthCheckState;
  };
}

export type RegisterAccountType = "individual" | "school_admin" | "school_student" | "mentor";
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
  firstName: string | null;
  lastName: string | null;
  /** Short-lived signed URL, or null when no avatar is set. */
  avatarUrl: string | null;
  /** IANA zone; null means "use the viewer's browser zone". */
  timezone: string | null;
  /** BCP-47 tag; null means "use the viewer's browser locale". */
  locale: string | null;
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
  /** Set when the user has a platform-level mentor profile (no tenant). */
  mentor: { id: string } | null;
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
  headline?: string;
  expertise?: string[];
}

// ── Mentor feature ──────────────────────────────────────────────────

export type MentorRequestStatus = "pending" | "accepted" | "declined" | "withdrawn";
export type GuidancePlanStatus = "draft" | "active" | "completed";
export type GuidanceStepStatus = "todo" | "in_progress" | "done";

export interface MentorSummary {
  id: string;
  userId: string;
  fullName: string;
  headline: string | null;
  bio: string | null;
  expertise: string[];
  acceptingStudents: boolean;
  /** The calling student's request status with this mentor, if any. */
  requestStatus: MentorRequestStatus | null;
}

export interface MentorBrowseResponse {
  mentors: MentorSummary[];
  page: number;
  pageSize: number;
  total: number;
}

export interface MentorRequestRecord {
  id: string;
  status: MentorRequestStatus;
  message: string | null;
  createdAt: string;
  respondedAt: string | null;
  student: { id: string; fullName: string; email: string };
}

export interface MentorRequestsResponse {
  requests: MentorRequestRecord[];
}

/** Optional link from a step to a real platform action (e.g. an experience program). */
export interface GuidanceStepLink {
  kind: "program";
  slug: string;
  label: string;
}

export interface GuidanceStep {
  id: string;
  title: string;
  detail?: string;
  status: GuidanceStepStatus;
  order: number;
  /** When set, the step is tracked against the student's real progress. */
  link?: GuidanceStepLink | null;
  /** Computed on read for linked steps from the student's actual progress (read-only). */
  liveStatus?: GuidanceStepStatus | null;
}

export interface UpdateStepStatusPayload {
  status: GuidanceStepStatus;
}

export interface GuidancePlanRecord {
  id: string;
  title: string;
  summary: string | null;
  notes: string | null;
  steps: GuidanceStep[];
  linkedCareerIds: string[];
  status: GuidancePlanStatus;
  createdAt: string;
  updatedAt: string;
}

export interface GuidancePlanResponse {
  plan: GuidancePlanRecord | null;
}

export interface MentorStudentSummary {
  userId: string;
  fullName: string;
  email: string;
  requestId: string;
  hasPlan: boolean;
  lastMessageAt: string | null;
}

export interface MentorStudentsResponse {
  students: MentorStudentSummary[];
}

export interface MentorStudentDetail {
  requestId: string;
  student: { id: string; fullName: string; email: string };
  profileCompletion: string | null;
  favoriteSubjects: string[];
  personalStrengths: string[];
  topRecommendations: string[];
  proofReadinessBand: string | null;
  programReadinessBand: string | null;
}

export interface MentorStudentDetailResponse {
  student: MentorStudentDetail | null;
}

export interface MentorMessageRecord {
  id: string;
  body: string;
  senderUserId: string;
  createdAt: string;
}

export interface MentorMessagesResponse {
  messages: MentorMessageRecord[];
  /** The authenticated user's id, so the UI can align sent vs received. */
  viewerUserId: string;
}

export interface SendMessagePayload {
  body: string;
}

export interface StudentMentorRecord {
  requestId: string;
  mentorProfileId: string;
  mentorUserId: string;
  fullName: string;
  headline: string | null;
  status: MentorRequestStatus;
  plan: GuidancePlanRecord | null;
  lastMessageAt: string | null;
}

export interface StudentMentorsResponse {
  mentors: StudentMentorRecord[];
}

export interface BecomeMentorPayload {
  headline?: string;
  bio?: string;
  expertise?: string[];
  acceptingStudents?: boolean;
}

export interface RequestMentorPayload {
  message?: string;
}

export interface GuidancePlanPayload {
  title: string;
  summary?: string;
  notes?: string;
  steps: GuidanceStep[];
  linkedCareerIds?: string[];
  status?: GuidancePlanStatus;
}

export interface LoginPayload {
  email: string;
  password: string;
}

// ── Account settings ───────────────────────────────────────────

/** The account as its owner sees it. Never returned for another user. */
export interface AccountProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  phone: string | null;
  timezone: string | null;
  locale: string | null;
  avatarUrl: string | null;
  accountType: UserAccountType;
  status: UserStatus;
  /** Providers linked to this account, e.g. ["google"]. */
  linkedProviders: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AccountResponse {
  account: AccountProfile;
}

/** Field-level patch. Omitted keys are left unchanged; null clears a value. */
export interface UpdateAccountPayload {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  timezone?: string | null;
  locale?: string | null;
}

export interface AvatarUploadInitPayload {
  mimeType: string;
  sizeBytes: number;
}

export interface AvatarUploadInitResponse {
  mediaId: string;
  upload: SignedUploadTarget;
}

/** Options a client can render for the timezone/locale pickers. */
export interface AccountOptionsResponse {
  timezones: string[];
  locales: string[];
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
  cachedAssessmentQuestions?: ProofQuestionSet | null;
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

// ── Background jobs & queue contracts ───────────────────────────────
// Shared between the API (producer) and the worker process (consumer).

export type QueueName =
  | "transcoding"
  | "evaluation"
  | "scheduling"
  | "notifications"
  | "ai-draft"
  | "reports";

export interface JobEnvelope<TPayload> {
  /** Dedupes re-enqueues of the same logical job (BullMQ jobId). */
  idempotencyKey?: string;
  /** ISO timestamp the job was enqueued (stamped by the producer). */
  enqueuedAt: string;
  payload: TPayload;
}

/** Reports — moves existing synchronous report generation off the request path. */
export interface GenerateStudentReportJobPayload {
  reportId: string;
  userId: string;
}

export interface GenerateSchoolReportJobPayload {
  reportId: string;
  tenantId: string;
}

/** Notifications — daily reminders and lifecycle messages. */
export interface DeliverNotificationJobPayload {
  notificationId: string;
}

/** Media transcoding — Phase C ingestion (contract reserved). */
export interface TranscodeMediaJobPayload {
  mediaAssetId: string;
}

/** Async evaluation — Phase E (contract reserved). */
export interface EvaluateSubmissionJobPayload {
  enrollmentId: string;
  scope: "block" | "day" | "final";
  submissionId?: string;
}

/** AI program draft generation — Phase C (contract reserved). */
export interface GenerateProgramDraftJobPayload {
  programId: string;
  careerSlug: string;
  promptVersion: string;
}

/** Day unlock + reminder scheduling — Phase D (contract reserved). */
export interface UnlockEnrollmentDayJobPayload {
  enrollmentId: string;
  dayIndex: number;
}

// ── Object storage contracts ────────────────────────────────────────

export type StorageDriverName = "s3" | "local";

export interface SignedUploadTarget {
  key: string;
  url: string;
  method: "PUT";
  headers: Record<string, string>;
  expiresInSeconds: number;
}

export interface SignedDownloadUrl {
  url: string;
  expiresInSeconds: number;
}

// ── Experience Program — content/catalog read contracts ─────────────

export type ProgramStatus = "draft" | "in_review" | "published" | "archived";
export type ProgramModuleType = "lesson" | "scenario" | "task" | "reflection";
export type ProgramContentBlockKind =
  | "text"
  | "video"
  | "audio"
  | "panorama360"
  | "scenario"
  | "task_prompt";
export type ProgramMediaKind = "video" | "audio" | "panorama360" | "image";

export interface ProgramSummary {
  id: string;
  slug: string;
  title: string;
  summary: string;
  careerId: string | null;
  status: ProgramStatus;
  durationDays: number | null;
}

export interface ProgramListResponse {
  programs: ProgramSummary[];
}

export interface ProgramMediaRef {
  id: string;
  kind: ProgramMediaKind;
  status: string;
  /** Short-lived signed URL minted on read; null until the asset is ready. */
  url: string | null;
  captionsUrl: string | null;
  durationSec: number | null;
}

export interface ProgramContentBlockView {
  id: string;
  order: number;
  kind: ProgramContentBlockKind;
  body: Record<string, unknown> | null;
  media: ProgramMediaRef | null;
}

export interface ProgramModuleView {
  id: string;
  order: number;
  type: ProgramModuleType;
  title: string;
  blocks: ProgramContentBlockView[];
}

export interface ProgramDayView {
  id: string;
  dayIndex: number;
  title: string;
  objective: string | null;
  estimatedMinutes: number | null;
  modules: ProgramModuleView[];
}

export interface ProgramDetail extends ProgramSummary {
  version: number;
  days: ProgramDayView[];
}

export interface ProgramDetailResponse {
  program: ProgramDetail | null;
}

// ── Experience Program — authoring/admin contracts ──────────────────

export interface ProgramAdminVersionSummary {
  id: string;
  version: number;
  state: string;
  durationDays: number;
}

export interface ProgramAdminSummary {
  id: string;
  slug: string;
  title: string;
  status: ProgramStatus;
  currentPublishedVersionId: string | null;
  versions: ProgramAdminVersionSummary[];
}

export interface ProgramAdminListResponse {
  programs: ProgramAdminSummary[];
}

export interface ProgramAdminVersionDetail {
  id: string;
  version: number;
  state: string;
  durationDays: number;
  generationSource: string;
  days: ProgramDayView[];
}

export interface ProgramAdminVersionResponse {
  version: ProgramAdminVersionDetail;
}

// ── Media ingestion contracts ───────────────────────────────────────

export interface MediaView {
  id: string;
  kind: ProgramMediaKind;
  status: string;
  mimeType: string | null;
  url: string | null;
  durationSec: number | null;
}

export interface MediaInitResponse {
  mediaId: string;
  upload: SignedUploadTarget;
}

// ── Experience Program — enrollment / runtime contracts ─────────────

export type EnrollmentStatus = "active" | "completed" | "paused" | "expired" | "abandoned";
export type DayState = "locked" | "available" | "in_progress" | "completed";
export type BlockProgressState = "not_started" | "in_progress" | "completed";

export interface EnrollmentSummary {
  id: string;
  programId: string;
  programSlug: string;
  programTitle: string;
  status: EnrollmentStatus;
  currentDayIndex: number;
  durationDays: number;
  completedDays: number;
  startedAt: string;
  completedAt: string | null;
}

export interface EnrollmentDaySummary {
  dayIndex: number;
  title: string;
  objective: string | null;
  estimatedMinutes: number | null;
  state: DayState;
}

export interface EnrollmentDetail extends EnrollmentSummary {
  days: EnrollmentDaySummary[];
}

export interface EnrollmentBlockView extends ProgramContentBlockView {
  state: BlockProgressState;
  interaction: Record<string, unknown> | null;
}

export interface EnrollmentModuleView {
  id: string;
  order: number;
  type: ProgramModuleType;
  title: string;
  blocks: EnrollmentBlockView[];
}

export interface EnrollmentDayView {
  dayIndex: number;
  title: string;
  objective: string | null;
  estimatedMinutes: number | null;
  state: DayState;
  modules: EnrollmentModuleView[];
}

export interface EnrollResponse {
  enrollment: EnrollmentSummary;
}

export interface EnrollmentListResponse {
  enrollments: EnrollmentSummary[];
}

export interface EnrollmentDetailResponse {
  enrollment: EnrollmentDetail | null;
}

export interface EnrollmentDayResponse {
  enrollment: EnrollmentSummary;
  day: EnrollmentDayView | null;
}

export interface BlockProgressResponse {
  ok: boolean;
  blockId: string;
  state: BlockProgressState;
  dayCompleted: boolean;
  enrollment: EnrollmentSummary;
}

// ── Experience Program — evidence submission (student uploads) ───────

/** Media a student can submit as evidence for a task block. */
export type EvidenceKind = "video" | "audio" | "image";

/** Response to initialising an evidence upload: a record id + signed PUT target. */
export interface EvidenceUploadInitResponse {
  evidenceId: string;
  mediaId: string;
  kind: EvidenceKind;
  upload: SignedUploadTarget;
}

// ── Experience Program — program-outcome report (Phase F) ───────────

/** Durable, shareable outcome of a completed program enrollment. */
export interface ProgramOutcomeReport {
  generatedAt: string;
  enrollmentId: string;
  programTitle: string;
  student: { id: string; fullName: string };
  status: EnrollmentStatus;
  completedDays: number;
  durationDays: number;
  completedAt: string | null;
  overallScore: number | null;
  readinessBand: string | null;
  narrative: string | null;
  dimensions: EvaluationDimensionScore[];
  strengths: string[];
  risks: string[];
  nextSteps: string[];
  evidenceCount: number;
  scenarioDecisions: number;
}

export interface ProgramOutcomeReportResponse {
  /** Null until the enrollment is completed and evaluated. */
  report: ProgramOutcomeReport | null;
  /** Short-lived signed URL to the durable JSON export (null if not ready). */
  fileUrl: string | null;
}

// ── Experience Program — evaluation / readiness result ──────────────

export interface EvaluateEnrollmentJobPayload {
  enrollmentId: string;
}

export interface EvaluationDimensionScore {
  key: string;
  score: number;
  label: string;
}

export interface EvaluationResultView {
  scope: "block" | "day" | "final";
  overallScore: number | null;
  points: number | null;
  readinessBand: string | null;
  narrative: string | null;
  dimensions: EvaluationDimensionScore[];
  strengths: string[];
  risks: string[];
  nextSteps: string[];
  scoringSource: string | null;
  createdAt: string;
}

export interface EnrollmentResultResponse {
  /** none = program not finished; pending = finished, evaluation running; ready = available. */
  status: "none" | "pending" | "ready";
  result: EvaluationResultView | null;
}

// ── Notifications ───────────────────────────────────────────────────

export type NotificationChannel = "email" | "in_app";
export type NotificationStatus = "pending" | "sent" | "failed" | "read";

export interface NotificationView {
  id: string;
  type: string;
  title: string;
  body: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationListResponse {
  notifications: NotificationView[];
}
