"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

import { generateSchoolReport, getLatestSchoolReport } from "@/lib/api";

export function GenerateSchoolReportButton({ tenantId }: { tenantId: string }): JSX.Element {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate(): Promise<void> {
    setPending(true);
    setError(null);

    try {
      // Generation is asynchronous: poll the latest report until ready/failed.
      const queued = await generateSchoolReport(tenantId);
      const reportId = queued.report?.id;
      let status = queued.report?.status;
      const deadline = Date.now() + 60_000;

      while (status !== "ready" && status !== "failed" && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const latest = await getLatestSchoolReport(tenantId);
        if (latest?.report && (!reportId || latest.report.id === reportId)) {
          status = latest.report.status;
        }
      }

      if (status === "failed") {
        setError("Report generation failed. Please try again.");
        return;
      }

      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate school report.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: "10px" }}>
      <button
        type="button"
        onClick={handleGenerate}
        disabled={pending}
        style={{
          border: 0,
          borderRadius: "999px",
          padding: "12px 18px",
          background: "linear-gradient(135deg, #6d5efc, #9b6bf8)",
          color: "#fff",
          cursor: pending ? "wait" : "pointer"
        }}
      >
        {pending ? "Generating report..." : "Generate school report"}
      </button>
      {error ? <p style={{ margin: 0, color: "#b42318" }}>{error}</p> : null}
    </div>
  );
}
