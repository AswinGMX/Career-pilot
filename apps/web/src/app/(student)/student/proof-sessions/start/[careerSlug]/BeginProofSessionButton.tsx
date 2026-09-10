"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { startProofSession } from "@/lib/api";

export function BeginProofSessionButton({ careerSlug }: { careerSlug: string }): JSX.Element {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    setPending(true);
    setError(null);

    try {
      const response = await startProofSession({ careerSlug });
      router.push(`/student/proof-sessions/${response.session.id}`);
      router.refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to start proof session.");
      setPending(false);
    }
  };

  return (
    <div className="form-stack">
      <button type="button" onClick={handleStart} disabled={pending} className="button-primary">
        {pending ? "Preparing proof session…" : "Begin session"}
      </button>
      {error ? (
        <p className="status-text--error" style={{ margin: 0 }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
