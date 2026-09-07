"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { enrollInProgram } from "@/lib/api";

export function EnrollButton({ slug }: { slug: string }): JSX.Element {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEnroll(): Promise<void> {
    setPending(true);
    setError(null);
    try {
      const { enrollment } = await enrollInProgram(slug);
      router.push(`/student/programs/enrolled/${enrollment.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to enroll.");
      setPending(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: "8px" }}>
      <button
        type="button"
        onClick={handleEnroll}
        disabled={pending}
        style={{
          border: 0,
          borderRadius: "999px",
          padding: "12px 18px",
          background: "linear-gradient(135deg, #6d5efc, #9b6bf8)",
          color: "#fff",
          cursor: pending ? "wait" : "pointer",
          justifySelf: "start"
        }}
      >
        {pending ? "Enrolling…" : "Start this program"}
      </button>
      {error ? <p style={{ margin: 0, color: "#b42318" }}>{error}</p> : null}
    </div>
  );
}
