"use client";

import { useState } from "react";

import { getProgramReport } from "@/lib/api";

/** Fetches the durable program-outcome export on demand and opens it. */
export function ProgramReportButton({ enrollmentId }: { enrollmentId: string }): JSX.Element {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const { fileUrl } = await getProgramReport(enrollmentId);
      if (fileUrl) {
        window.open(fileUrl, "_blank", "noopener,noreferrer");
      } else {
        setError("Report is not ready yet.");
      }
    } catch {
      setError("Could not generate the report.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void download()}
        disabled={busy}
        style={{
          display: "inline-block",
          borderRadius: "999px",
          padding: "8px 14px",
          border: "1px solid #6d5efc",
          background: "#fff",
          color: "#6d5efc",
          cursor: busy ? "default" : "pointer",
          fontWeight: 600
        }}
      >
        {busy ? "Preparing…" : "Download outcome report"}
      </button>
      {error ? <p style={{ margin: "6px 0 0", color: "#b42318", fontSize: "13px" }}>{error}</p> : null}
    </div>
  );
}
