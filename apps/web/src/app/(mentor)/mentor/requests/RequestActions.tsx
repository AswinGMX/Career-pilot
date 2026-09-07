"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { respondToMentorRequest } from "@/lib/api";

export function RequestActions({ requestId }: { requestId: string }): JSX.Element {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function respond(accept: boolean): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await respondToMentorRequest(requestId, accept);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update request.");
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: "10px", alignItems: "center", marginTop: "12px" }}>
      <button type="button" className="button-primary" disabled={busy} onClick={() => void respond(true)}>
        {busy ? "…" : "Accept"}
      </button>
      <button type="button" className="button-ghost" disabled={busy} onClick={() => void respond(false)}>
        Decline
      </button>
      {error ? <span className="status-text--error">{error}</span> : null}
    </div>
  );
}
