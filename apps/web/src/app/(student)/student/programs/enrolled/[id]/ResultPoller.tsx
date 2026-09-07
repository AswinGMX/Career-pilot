"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { getEnrollmentResult } from "@/lib/api";

/** Polls for the readiness result while it's being evaluated, then refreshes. */
export function ResultPoller({ enrollmentId }: { enrollmentId: string }): JSX.Element {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    const deadline = Date.now() + 60_000;

    const tick = async (): Promise<void> => {
      if (!active || Date.now() > deadline) {
        return;
      }
      const result = await getEnrollmentResult(enrollmentId);
      if (!active) {
        return;
      }
      if (result.status === "ready") {
        router.refresh();
        return;
      }
      setTimeout(tick, 2500);
    };

    const timer = setTimeout(tick, 2500);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [enrollmentId, router]);

  return <p className="muted-text" style={{ margin: 0 }}>Evaluating your readiness… this updates automatically.</p>;
}
