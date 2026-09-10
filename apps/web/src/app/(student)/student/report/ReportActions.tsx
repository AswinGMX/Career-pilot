"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

import {
  createStudentReportShare,
  generateStudentReport,
  getLatestStudentReport,
  revokeStudentReportShare
} from "@/lib/api";

export function GenerateStudentReportButton(): JSX.Element {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate(): Promise<void> {
    setPending(true);
    setError(null);

    try {
      // Generation is asynchronous: the API queues the job and a worker prepares
      // the report. Poll the latest report until it is ready (or failed).
      const queued = await generateStudentReport();
      const reportId = queued.report?.id;
      let status = queued.report?.status;
      const deadline = Date.now() + 60_000;

      while (status !== "ready" && status !== "failed" && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const latest = await getLatestStudentReport();
        if (latest.report && (!reportId || latest.report.id === reportId)) {
          status = latest.report.status;
        }
      }

      if (status === "failed") {
        setError("Report generation failed. Please try again.");
        return;
      }

      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate report.");
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
        {pending ? "Generating report..." : "Generate fresh report"}
      </button>
      {error ? <p style={{ margin: 0, color: "#b42318" }}>{error}</p> : null}
    </div>
  );
}

export function CreateParentShareButton(): JSX.Element {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  async function handleCreate(): Promise<void> {
    setPending(true);
    setError(null);

    try {
      const response = await createStudentReportShare({ expiresInDays: 14 });
      setShareUrl(response.share.publicUrl || null);
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create share link.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: "10px" }}>
      <button
        type="button"
        onClick={handleCreate}
        disabled={pending}
        style={{
          border: "1px solid #5340d6",
          borderRadius: "999px",
          padding: "12px 18px",
          background: "#fff",
          color: "#5340d6",
          cursor: pending ? "wait" : "pointer"
        }}
      >
        {pending ? "Creating link..." : "Create parent share link"}
      </button>
      {shareUrl ? (
        <p style={{ margin: 0, color: "#334a62", wordBreak: "break-all" }}>
          Share URL: <a href={shareUrl}>{shareUrl}</a>
        </p>
      ) : null}
      {error ? <p style={{ margin: 0, color: "#b42318" }}>{error}</p> : null}
    </div>
  );
}

export function RevokeShareButton({ shareId }: { shareId: string }): JSX.Element {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRevoke(): Promise<void> {
    setPending(true);
    setError(null);

    try {
      await revokeStudentReportShare(shareId);
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to revoke share link.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: "6px" }}>
      <button
        type="button"
        onClick={handleRevoke}
        disabled={pending}
        style={{
          border: "1px solid #d0d5dd",
          borderRadius: "999px",
          padding: "8px 12px",
          background: "#fff",
          cursor: pending ? "wait" : "pointer"
        }}
      >
        {pending ? "Revoking..." : "Revoke"}
      </button>
      {error ? <p style={{ margin: 0, color: "#b42318", fontSize: "12px" }}>{error}</p> : null}
    </div>
  );
}
