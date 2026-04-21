import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { adminApi } from "@/features/admin/api";
import type {
  AdminStudentReportPayload,
  SchoolOverviewResponse
} from "@/features/admin/types";
import { useUiStore } from "@/store";

export function useAdminStudentsPage(): {
  overview: SchoolOverviewResponse | null;
  selectedStudent: AdminStudentReportPayload | null;
  isLoading: boolean;
  isSelectingStudent: boolean;
  selectStudent: (studentId: string) => Promise<void>;
} {
  const [overview, setOverview] = useState<SchoolOverviewResponse | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<AdminStudentReportPayload | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSelectingStudent, setIsSelectingStudent] = useState<boolean>(false);
  const [searchParams] = useSearchParams();
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

  const selectStudent = useCallback(
    async (studentId: string) => {
      setIsSelectingStudent(true);

      try {
        const response = await adminApi.getStudentReport(studentId);
        setSelectedStudent(response);
      } catch (error) {
        showNotice((error as Error).message, "danger");
      } finally {
        setIsSelectingStudent(false);
      }
    },
    [showNotice]
  );

  useEffect(() => {
    const requestedStudentId = searchParams.get("studentId");

    if (!overview || !requestedStudentId) {
      return;
    }

    const studentExists = overview.students.some((item) => item.student.id === requestedStudentId);
    if (!studentExists || selectedStudent?.student.id === requestedStudentId) {
      return;
    }

    void selectStudent(requestedStudentId);
  }, [overview, searchParams, selectStudent, selectedStudent]);

  return {
    overview,
    selectedStudent,
    isLoading,
    isSelectingStudent,
    selectStudent
  };
}
