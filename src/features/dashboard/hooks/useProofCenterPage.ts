import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { dashboardApi } from "@/features/dashboard/api";
import type { ProofSession, StudentDashboardResponse } from "@/features/dashboard/types";
import { useUiStore } from "@/store";

const minimumProofStartDurationMs = 1400;

function wait(durationMs: number): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, durationMs);
  });
}

export function useProofCenterPage(): {
  dashboard: StudentDashboardResponse | null;
  currentProofSession: ProofSession | null;
  isLoading: boolean;
  isStartingProofSession: boolean;
  isSubmittingProofSession: boolean;
  startProofSession: (careerId: string) => Promise<void>;
  submitProofSession: (answers: Record<string, number>) => Promise<void>;
} {
  const [dashboard, setDashboard] = useState<StudentDashboardResponse | null>(null);
  const [currentProofSession, setCurrentProofSession] = useState<ProofSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isStartingProofSession, setIsStartingProofSession] = useState<boolean>(false);
  const [isSubmittingProofSession, setIsSubmittingProofSession] = useState<boolean>(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const showNotice = useUiStore((state) => state.showNotice);
  const requestedCareerIdRef = useRef<string>("");

  const refresh = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await dashboardApi.getDashboard();
      setDashboard(response);
    } catch (error) {
      showNotice((error as Error).message, "danger");
    } finally {
      setIsLoading(false);
    }
  }, [showNotice]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const startProofSession = useCallback(
    async (careerId: string) => {
      setIsStartingProofSession(true);

      try {
        const [response] = await Promise.all([
          dashboardApi.startProofSession(careerId),
          wait(minimumProofStartDurationMs)
        ]);
        setCurrentProofSession(response.session);
        showNotice("Proof session started. Complete every question to submit evidence.", "success");
      } catch (error) {
        showNotice((error as Error).message, "danger");
      } finally {
        setIsStartingProofSession(false);
      }
    },
    [showNotice]
  );

  useEffect(() => {
    const careerId = searchParams.get("careerId");

    if (!careerId || requestedCareerIdRef.current === careerId || currentProofSession) {
      return;
    }

    requestedCareerIdRef.current = careerId;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("careerId");
    setSearchParams(nextParams, { replace: true });
    void startProofSession(careerId);
  }, [currentProofSession, searchParams, setSearchParams, startProofSession]);

  const submitProofSession = useCallback(
    async (answers: Record<string, number>) => {
      if (!currentProofSession) {
        showNotice("No active proof session is available.", "warning");
        return;
      }

      const payloadAnswers = currentProofSession.questionSet.questions.map((question) => ({
        questionId: question.id,
        optionIndex: Number(answers[question.id])
      }));

      if (payloadAnswers.some((item) => Number.isNaN(item.optionIndex))) {
        showNotice("Please answer every proof question before submitting.", "danger");
        return;
      }

      setIsSubmittingProofSession(true);

      try {
        await dashboardApi.submitProofSession(currentProofSession.id, payloadAnswers);
        setCurrentProofSession(null);
        requestedCareerIdRef.current = "";
        await refresh();
        showNotice("Proof evidence completed successfully.", "success");
      } catch (error) {
        showNotice((error as Error).message, "danger");
      } finally {
        setIsSubmittingProofSession(false);
      }
    },
    [currentProofSession, refresh, showNotice]
  );

  return {
    dashboard,
    currentProofSession,
    isLoading,
    isStartingProofSession,
    isSubmittingProofSession,
    startProofSession,
    submitProofSession
  };
}
