"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { becomeMentor } from "@/lib/api";

export function MentorProfileForm(): JSX.Element {
  const router = useRouter();
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [expertise, setExpertise] = useState("");
  const [acceptingStudents, setAcceptingStudents] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(): Promise<void> {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await becomeMentor({
        headline: headline.trim() || undefined,
        bio: bio.trim() || undefined,
        expertise: expertise
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        acceptingStudents
      });
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save profile.");
    } finally {
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
          placeholder="e.g. Senior Data Scientist · 10 yrs mentoring students"
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
          placeholder="Data Science, Machine Learning, Interview prep"
        />
      </label>
      <label style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <input type="checkbox" checked={acceptingStudents} onChange={(e) => setAcceptingStudents(e.target.checked)} />
        <span>Accepting new students</span>
      </label>
      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        <button type="button" className="button-primary" disabled={saving} onClick={() => void save()}>
          {saving ? "Saving…" : "Save profile"}
        </button>
        {saved ? <span style={{ color: "#067647", fontWeight: 600 }}>Saved ✓</span> : null}
        {error ? <span className="status-text--error">{error}</span> : null}
      </div>
    </div>
  );
}
