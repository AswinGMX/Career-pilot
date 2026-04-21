import { useCallback, useEffect, useMemo, useState } from "react";

import { dashboardApi } from "@/features/dashboard/api";
import type {
  ProfileFormValues,
  ProfileQuestionSet,
  StudentDashboardResponse
} from "@/features/dashboard/types";
import { useAuthStore, useUiStore } from "@/store";

const emptyProfileForm: ProfileFormValues = {
  ageRange: "",
  grade: "",
  favoriteSubjects: "",
  favoriteActivities: "",
  topicsCuriousAbout: "",
  personalStrengths: "",
  avoidsOrDislikes: ""
};

const minimumGenerateDurationMs = 1400;

function wait(durationMs: number): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, durationMs);
  });
}

function buildProfileValues(dashboard: StudentDashboardResponse | null, fallbackGrade: string): ProfileFormValues {
  return {
    ...emptyProfileForm,
    ...dashboard?.profile?.basicInfo,
    grade: dashboard?.profile?.basicInfo.grade || fallbackGrade || ""
  };
}

export function useProfileStudioPage(): {
  dashboard: StudentDashboardResponse | null;
  formValues: ProfileFormValues;
  questionSet: ProfileQuestionSet | null;
  isDirty: boolean;
  isLoading: boolean;
  isGeneratingQuestions: boolean;
  isSubmittingProfile: boolean;
  updateField: (field: keyof ProfileFormValues, value: string) => void;
  generateQuestions: () => Promise<void>;
  submitProfile: (answers: Record<string, number>) => Promise<void>;
} {
  const [dashboard, setDashboard] = useState<StudentDashboardResponse | null>(null);
  const [formValues, setFormValues] = useState<ProfileFormValues>(emptyProfileForm);
  const [baseline, setBaseline] = useState<ProfileFormValues>(emptyProfileForm);
  const [questionSet, setQuestionSet] = useState<ProfileQuestionSet | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState<boolean>(false);
  const [isSubmittingProfile, setIsSubmittingProfile] = useState<boolean>(false);
  const session = useAuthStore((state) => state.session);
  const showNotice = useUiStore((state) => state.showNotice);

  const hydrate = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await dashboardApi.getDashboard();
      const nextValues = buildProfileValues(response, session?.user?.grade || "");
      setDashboard(response);
      setFormValues(nextValues);
      setBaseline(nextValues);
    } catch (error) {
      showNotice((error as Error).message, "danger");
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.grade, showNotice]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const isDirty = useMemo(
    () => JSON.stringify(formValues) !== JSON.stringify(baseline) || Boolean(questionSet),
    [baseline, formValues, questionSet]
  );

  const updateField = useCallback((field: keyof ProfileFormValues, value: string) => {
    setFormValues((current) => ({
      ...current,
      [field]: value
    }));
  }, []);

  const generateQuestions = useCallback(async () => {
    setIsGeneratingQuestions(true);

    try {
      const [response] = await Promise.all([
        dashboardApi.generateProfileQuestionSet(formValues),
        wait(minimumGenerateDurationMs)
      ]);
      setQuestionSet(response);
      showNotice(`Short AI question set generated. Answer all ${response.questions.length} questions before submitting.`, "success");
    } catch (error) {
      showNotice((error as Error).message, "danger");
    } finally {
      setIsGeneratingQuestions(false);
    }
  }, [formValues, showNotice]);

  const submitProfile = useCallback(
    async (answers: Record<string, number>) => {
      if (!questionSet) {
        showNotice("Generate the AI question set first.", "warning");
        return;
      }

      const payloadAnswers = questionSet.questions.map((question) => ({
        questionId: question.id,
        optionIndex: Number(answers[question.id])
      }));

      if (payloadAnswers.some((item) => Number.isNaN(item.optionIndex))) {
        showNotice("Please answer every profile question before submitting.", "danger");
        return;
      }

      setIsSubmittingProfile(true);

      try {
        await dashboardApi.submitProfile({
          basicInfo: formValues,
          questionSet,
          answers: payloadAnswers
        });
        setQuestionSet(null);
        await hydrate();
        showNotice("Profile analyzed successfully. Recommendations are updated.", "success");
      } catch (error) {
        showNotice((error as Error).message, "danger");
      } finally {
        setIsSubmittingProfile(false);
      }
    },
    [formValues, hydrate, questionSet, showNotice]
  );

  return {
    dashboard,
    formValues,
    isDirty,
    isGeneratingQuestions,
    isLoading,
    isSubmittingProfile,
    questionSet,
    updateField,
    generateQuestions,
    submitProfile
  };
}
