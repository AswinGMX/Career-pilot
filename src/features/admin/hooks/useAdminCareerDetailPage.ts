import { useCallback, useEffect, useState } from "react";

import { adminApi } from "@/features/admin/api";
import type { Career } from "@/features/dashboard/types";
import { useUiStore } from "@/store";

export function useAdminCareerDetailPage(careerId: string | undefined): {
  career: Career | null;
  isLoading: boolean;
} {
  const [career, setCareer] = useState<Career | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const showNotice = useUiStore((state) => state.showNotice);

  const loadCareer = useCallback(async () => {
    if (!careerId) {
      setCareer(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const response = await adminApi.getCareers();
      setCareer(response.careers.find((item) => item.id === careerId) || null);
    } catch (error) {
      setCareer(null);
      showNotice((error as Error).message, "danger");
    } finally {
      setIsLoading(false);
    }
  }, [careerId, showNotice]);

  useEffect(() => {
    void loadCareer();
  }, [loadCareer]);

  return {
    career,
    isLoading
  };
}
