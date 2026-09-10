"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { MentorRequestStatus } from "@career-pilot/types";

import { requestMentor } from "@/lib/api";

export function RequestMentorButton({
  mentorProfileId,
  status
}: {
  mentorProfileId: string;
  status: MentorRequestStatus | null;
}): JSX.Element {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === "accepted") {
    return <span className="app-eyebrow" style={{ color: "#067647" }}>Connected ✓</span>;
  }
  if (status === "pending") {
    return <span className="app-eyebrow">Request pending…</span>;
  }

  async function send(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await requestMentor(mentorProfileId, {});
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send request.");
      setBusy(false);
    }
  }

  return (
    <div>
      <button type="button" className="button-primary" disabled={busy} onClick={() => void send()}>
        {busy ? "Sending…" : status === "declined" ? "Request again" : "Request mentor"}
      </button>
      {error ? <p className="status-text--error" style={{ margin: "6px 0 0" }}>{error}</p> : null}
    </div>
  );
}
