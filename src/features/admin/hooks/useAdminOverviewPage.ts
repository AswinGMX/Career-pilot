import { useCallback, useEffect, useMemo, useState } from "react";

import { adminApi } from "@/features/admin/api";
import type {
  AdminOverviewAttentionStudent,
  AdminOverviewDashboard,
  AdminOverviewRecentProofActivity,
  AdminOverviewTopStudent,
  SchoolOverviewResponse,
  SchoolStudentCard
} from "@/features/admin/types";
import { getProofReadinessState } from "@/shared/utils";
import { useUiStore } from "@/store";

export function useAdminOverviewPage(): {
  overview: SchoolOverviewResponse | null;
  dashboard: AdminOverviewDashboard | null;
  isLoading: boolean;
} {
  const [overview, setOverview] = useState<SchoolOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const showNotice = useUiStore((state) => state.showNotice);

  const load = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await adminApi.getOverview();
      setOverview(response);
    } catch (error) {
      showNotice((error as Error).message, "danger");
    } finally {
      setIsLoading(false);
    }
  }, [showNotice]);

  useEffect(() => {
    void load();
  }, [load]);

  const dashboard = useMemo<AdminOverviewDashboard | null>(() => {
    if (!overview) {
      return null;
    }

    return buildAdminOverviewDashboard(overview);
  }, [overview]);

  return {
    overview,
    dashboard,
    isLoading
  };
}

function buildAdminOverviewDashboard(overview: SchoolOverviewResponse): AdminOverviewDashboard {
  const totalStudents = overview.stats.totalStudents;
  const studentsWithProof = overview.students.filter((item) => Boolean(item.latestProof)).length;
  const studentsWithoutProof = Math.max(0, totalStudents - studentsWithProof);
  const studentsPendingProfile = Math.max(0, totalStudents - overview.stats.completedProfiles);
  const profileCompletionRate =
    totalStudents > 0 ? Math.round((overview.stats.completedProfiles / totalStudents) * 100) : 0;
  const averageProofPoints =
    studentsWithProof > 0
      ? Math.round(
          overview.students.filter((item) => item.latestProof).reduce((sum, item) => sum + item.totalPoints, 0) /
            studentsWithProof
        )
      : 0;

  return {
    helperText: buildHelperText({
      totalStudents,
      completedProfiles: overview.stats.completedProfiles,
      studentsPendingProfile,
      studentsWithProof
    }),
    profileCompletionRate,
    studentsPendingProfile,
    studentsWithoutProof,
    studentsWithProof,
    averageProofPoints,
    ...buildPrioritySummary({
      totalStudents,
      studentsPendingProfile,
      studentsWithoutProof,
      studentsWithProof
    }),
    recommendationSpotlight: buildRecommendationSpotlight(overview.students),
    topStudents: buildTopStudents(overview.students),
    recentProofActivity: buildRecentProofActivity(overview.students),
    attentionStudents: buildAttentionStudents(overview.students)
  };
}

function buildHelperText(input: {
  totalStudents: number;
  completedProfiles: number;
  studentsPendingProfile: number;
  studentsWithProof: number;
}): string {
  if (input.totalStudents === 0) {
    return "No learners have been onboarded yet. Start by creating the first student account and sharing the tenant join code.";
  }

  if (input.completedProfiles === 0) {
    return `You have ${input.totalStudents} learner${input.totalStudents === 1 ? "" : "s"} in the tenant, but none have completed the AI profile yet.`;
  }

  if (input.studentsWithProof === 0) {
    return `${input.completedProfiles} learner${input.completedProfiles === 1 ? "" : "s"} completed profiles, and the next push is turning recommendations into proof evidence.`;
  }

  return `${input.completedProfiles} of ${input.totalStudents} learners have completed profiles, ${input.studentsPendingProfile} still need profile attention, and ${input.studentsWithProof} already have proof activity on record.`;
}

function buildTopStudents(students: SchoolStudentCard[]): AdminOverviewTopStudent[] {
  return students
    .filter((item) => item.totalPoints > 0 || Boolean(item.latestProof))
    .slice()
    .sort((left, right) => {
      if (right.totalPoints !== left.totalPoints) {
        return right.totalPoints - left.totalPoints;
      }

      return left.student.fullName.localeCompare(right.student.fullName);
    })
    .slice(0, 4)
    .map((item) => ({
      studentId: item.student.id,
      fullName: item.student.fullName,
      grade: item.student.grade || "Grade not set",
      totalPoints: item.totalPoints,
      latestProofTitle: item.latestProof?.careerTitle || null,
      topRecommendationTitle: item.topRecommendation?.title || null,
      profileCompleted: item.profileCompleted
    }));
}

function buildPrioritySummary(input: {
  totalStudents: number;
  studentsPendingProfile: number;
  studentsWithoutProof: number;
  studentsWithProof: number;
}): Pick<AdminOverviewDashboard, "priorityHeadline" | "priorityDescription"> {
  if (input.totalStudents === 0) {
    return {
      priorityHeadline: "Start onboarding your first learners",
      priorityDescription: "This tenant is still empty, so the immediate next step is creating the first student account."
    };
  }

  if (input.studentsPendingProfile > 0) {
    return {
      priorityHeadline: `${input.studentsPendingProfile} learner${input.studentsPendingProfile === 1 ? "" : "s"} still need profile completion`,
      priorityDescription:
        "The strongest immediate improvement is getting these students through profile creation so recommendations become reliable."
    };
  }

  if (input.studentsWithoutProof > 0) {
    return {
      priorityHeadline: `${input.studentsWithoutProof} learner${input.studentsWithoutProof === 1 ? "" : "s"} still need proof evidence`,
      priorityDescription:
        "Profiles are in place, so the next admin push is encouraging students to validate readiness through proof submissions."
    };
  }

  return {
    priorityHeadline: `${input.studentsWithProof} learner${input.studentsWithProof === 1 ? " has" : "s have"} active evidence momentum`,
    priorityDescription:
      "Your current school focus is maintaining consistency and helping more students build stronger proof scores."
  };
}

function buildRecommendationSpotlight(
  students: SchoolStudentCard[]
): AdminOverviewDashboard["recommendationSpotlight"] {
  const recommendationCounts = new Map<string, { title: string; count: number }>();

  students.forEach((item) => {
    if (!item.topRecommendation) {
      return;
    }

    const current = recommendationCounts.get(item.topRecommendation.id);
    if (current) {
      current.count += 1;
      return;
    }

    recommendationCounts.set(item.topRecommendation.id, {
      title: item.topRecommendation.title,
      count: 1
    });
  });

  const values = Array.from(recommendationCounts.values()).sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }

    return left.title.localeCompare(right.title);
  });

  return values[0] || null;
}

function buildRecentProofActivity(students: SchoolStudentCard[]): AdminOverviewRecentProofActivity[] {
  return students
    .filter((item) => item.latestProof)
    .slice()
    .sort((left, right) => {
      const leftTime = new Date(left.latestProof?.completedAt || 0).getTime();
      const rightTime = new Date(right.latestProof?.completedAt || 0).getTime();
      return rightTime - leftTime;
    })
    .slice(0, 5)
    .map((item) => {
      const latestProof = item.latestProof!;
      const readiness = getProofReadinessState(latestProof.overallScore);

      return {
        studentId: item.student.id,
        fullName: item.student.fullName,
        grade: item.student.grade || "Grade not set",
        careerTitle: latestProof.careerTitle,
        points: latestProof.points,
        overallScore: latestProof.overallScore,
        readinessBand: latestProof.readinessBand,
        completedAt: latestProof.completedAt,
        readinessTone: readiness.tone
      };
    });
}

function buildAttentionStudents(students: SchoolStudentCard[]): AdminOverviewAttentionStudent[] {
  return students
    .map((item) => {
      const missingProfile = !item.profileCompleted;
      const missingProof = !item.latestProof;
      let priority = -1;
      let statusLabel = "";
      let statusTone: "danger" | "warning" | "info" = "info";
      let note = "";

      if (missingProfile && missingProof) {
        priority = 3;
        statusLabel = "Profile + proof pending";
        statusTone = "danger";
        note = "This learner has not completed the AI profile and has no proof evidence yet.";
      } else if (missingProfile) {
        priority = 2;
        statusLabel = "Profile pending";
        statusTone = "danger";
        note = "The learner still needs to finish profile creation before recommendations can become reliable.";
      } else if (missingProof) {
        priority = 1;
        statusLabel = "Proof pending";
        statusTone = "warning";
        note = "The profile is complete, but no proof evidence has been submitted yet.";
      }

      return {
        studentId: item.student.id,
        fullName: item.student.fullName,
        grade: item.student.grade || "Grade not set",
        statusLabel,
        statusTone,
        note,
        topRecommendationTitle: item.topRecommendation?.title || null,
        priority
      };
    })
    .filter((item) => item.priority >= 0)
    .sort((left, right) => {
      if (right.priority !== left.priority) {
        return right.priority - left.priority;
      }

      return left.fullName.localeCompare(right.fullName);
    })
    .slice(0, 6)
    .map(({ priority, ...item }) => item);
}
