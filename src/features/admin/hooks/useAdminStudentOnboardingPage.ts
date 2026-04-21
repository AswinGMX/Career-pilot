import { useCallback, useEffect, useState } from "react";

import { adminApi } from "@/features/admin/api";
import type { CreateSchoolStudentPayload, SchoolOverviewResponse } from "@/features/admin/types";
import { useUiStore } from "@/store";

export function useAdminStudentOnboardingPage(): {
  overview: SchoolOverviewResponse | null;
  isLoading: boolean;
  isSubmitting: boolean;
  createStudent: (payload: CreateSchoolStudentPayload) => Promise<void>;
} {
  const [overview, setOverview] = useState<SchoolOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const showNotice = useUiStore((state) => state.showNotice);

  const refresh = useCallback(async () => {
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
    void refresh();
  }, [refresh]);

  const createStudent = useCallback(
    async (payload: CreateSchoolStudentPayload) => {
      setIsSubmitting(true);

      try {
        await adminApi.createStudent(payload);
        await refresh();
        showNotice("Student account created inside the tenant.", "success");
      } catch (error) {
        showNotice((error as Error).message, "danger");
      } finally {
        setIsSubmitting(false);
      }
    },
    [refresh, showNotice]
  );

  return {
    overview,
    isLoading,
    isSubmitting,
    createStudent
  };
}
