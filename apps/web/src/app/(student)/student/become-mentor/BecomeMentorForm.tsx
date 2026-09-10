"use client";

import { useState } from "react";

import { becomeMentor } from "@/lib/api";

export function BecomeMentorForm(): JSX.Element {
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [expertise, setExpertise] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(): Promise<void> {
    setSaving(true);
    setError(null);
    try {
      await becomeMentor({
        headline: headline.trim() || undefined,
        bio: bio.trim() || undefined,
        expertise: expertise
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      });
      // Becoming a mentor changes the session role → land on the mentor workspace.
      window.location.assign("/mentor/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to become a mentor.");
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: "14px" }}>
      <label className="field-label">
        <span>Headline</span>
        <input
          className="field-control"
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          placeholder="e.g. Senior Full-Stack Engineer · mentor"
        />
      </label>
      <label className="field-label">
        <span>Bio</span>
        <textarea
          className="field-control"
          rows={3}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell students about your background and how you help."
        />
      </label>
      <label className="field-label">
        <span>Areas of expertise (comma-separated)</span>
        <input
          className="field-control"
          value={expertise}
          onChange={(e) => setExpertise(e.target.value)}
          placeholder="Web Development, System Design, Interview prep"
        />
      </label>
      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        <button type="button" className="button-primary" disabled={saving} onClick={() => void submit()}>
          {saving ? "Setting up…" : "Become a mentor"}
        </button>
        {error ? <span className="status-text--error">{error}</span> : null}
      </div>
    </div>
  );
}
