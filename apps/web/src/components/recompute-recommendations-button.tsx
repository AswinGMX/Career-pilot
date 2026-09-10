"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { recomputeRecommendations } from "@/lib/api";

export function RecomputeRecommendationsButton(): JSX.Element {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setPending(true);
    setError(null);

    try {
      await recomputeRecommendations();
      router.refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Recommendation recompute failed.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "10px" }}>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="button-primary"
        style={{ padding: "0 22px", fontSize: "14px" }}
      >
        {pending ? "Recomputing..." : "Recompute recommendations"}
      </button>
      {error ? <p className="status-text--error" style={{ margin: 0 }}>{error}</p> : null}
    </div>
  );
}
