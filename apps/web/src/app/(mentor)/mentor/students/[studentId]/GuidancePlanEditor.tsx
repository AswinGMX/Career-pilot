"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { GuidancePlanRecord, GuidanceStep, GuidanceStepStatus, ProgramSummary } from "@career-pilot/types";

import { saveGuidancePlan } from "@/lib/api";

const STATUS_OPTIONS: { value: GuidanceStepStatus; label: string }[] = [
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" }
];

function newStep(order: number): GuidanceStep {
  const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `step-${order}-${Date.now()}`;
  return { id, title: "", detail: "", status: "todo", order };
}

export function GuidancePlanEditor({
  studentUserId,
  initialPlan,
  programs
}: {
  studentUserId: string;
  initialPlan: GuidancePlanRecord | null;
  programs: ProgramSummary[];
}): JSX.Element {
  const router = useRouter();
  const [title, setTitle] = useState(initialPlan?.title ?? "");
  const [summary, setSummary] = useState(initialPlan?.summary ?? "");
  const [notes, setNotes] = useState(initialPlan?.notes ?? "");
  const [steps, setSteps] = useState<GuidanceStep[]>(initialPlan?.steps ?? [newStep(0)]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function updateStep(id: string, patch: Partial<GuidanceStep>): void {
    setSteps((prev) => prev.map((step) => (step.id === id ? { ...step, ...patch } : step)));
  }
  function removeStep(id: string): void {
    setSteps((prev) => prev.filter((step) => step.id !== id));
  }
  function move(id: string, dir: -1 | 1): void {
    setSteps((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      const next = idx + dir;
      if (idx < 0 || next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[next]] = [copy[next], copy[idx]];
      return copy;
    });
  }

  async function save(): Promise<void> {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await saveGuidancePlan(studentUserId, {
        title: title.trim(),
        summary: summary.trim() || undefined,
        notes: notes.trim() || undefined,
        steps: steps
          .filter((s) => s.title.trim())
          .map((s, index) => ({ ...s, title: s.title.trim(), order: index })),
        status: "active"
      });
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save guidance plan.");
    } finally {
      setSaving(false);
    }
  }

  const canSave = title.trim().length > 0 && steps.some((s) => s.title.trim());

  return (
    <div style={{ display: "grid", gap: "16px" }}>
      <label className="field-label">
        <span>Plan title</span>
        <input
          className="field-control"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Path to a Data Science career"
        />
      </label>

      <label className="field-label">
        <span>Summary</span>
        <textarea
          className="field-control"
          rows={2}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="A short overview of where this student is headed."
        />
      </label>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <strong>Steps</strong>
          <button type="button" className="button-ghost" onClick={() => setSteps((p) => [...p, newStep(p.length)])}>
            + Add step
          </button>
        </div>
        <div style={{ display: "grid", gap: "10px" }}>
          {steps.map((step, index) => (
            <div key={step.id} style={{ border: "1px solid #e3e5ea", borderRadius: "10px", padding: "12px", display: "grid", gap: "8px" }}>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <span className="app-eyebrow">Step {index + 1}</span>
                <span style={{ marginLeft: "auto", display: "flex", gap: "6px" }}>
                  <button type="button" className="button-ghost" onClick={() => move(step.id, -1)} aria-label="Move up">↑</button>
                  <button type="button" className="button-ghost" onClick={() => move(step.id, 1)} aria-label="Move down">↓</button>
                  <button type="button" className="button-ghost" onClick={() => removeStep(step.id)} aria-label="Remove">✕</button>
                </span>
              </div>
              <input
                className="field-control"
                value={step.title}
                onChange={(e) => updateStep(step.id, { title: e.target.value })}
                placeholder="Step title (e.g. Complete the Software Engineer program)"
              />
              <textarea
                className="field-control"
                rows={2}
                value={step.detail ?? ""}
                onChange={(e) => updateStep(step.id, { detail: e.target.value })}
                placeholder="Details / what to do"
              />
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                <label style={{ fontSize: "12px", color: "#6b7280" }}>
                  Link a program{" "}
                  <select
                    className="field-control"
                    value={step.link?.slug ?? ""}
                    onChange={(e) => {
                      const program = programs.find((p) => p.slug === e.target.value);
                      updateStep(step.id, {
                        link: program ? { kind: "program", slug: program.slug, label: program.title } : null
                      });
                    }}
                    style={{ maxWidth: "260px", display: "inline-block" }}
                  >
                    <option value="">None (manual step)</option>
                    {programs.map((program) => (
                      <option key={program.slug} value={program.slug}>{program.title}</option>
                    ))}
                  </select>
                </label>
                {step.link ? (
                  <span className="app-eyebrow">Auto-tracked from the student&rsquo;s progress</span>
                ) : (
                  <select
                    className="field-control"
                    value={step.status}
                    onChange={(e) => updateStep(step.id, { status: e.target.value as GuidanceStepStatus })}
                    style={{ maxWidth: "180px" }}
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <label className="field-label">
        <span>Notes for the student</span>
        <textarea
          className="field-control"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Encouragement, context, or anything else they should know."
        />
      </label>

      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        <button type="button" className="button-primary" disabled={!canSave || saving} onClick={() => void save()}>
          {saving ? "Saving…" : initialPlan ? "Update plan" : "Create plan"}
        </button>
        {saved ? <span style={{ color: "#067647", fontWeight: 600 }}>Saved ✓</span> : null}
        {error ? <span className="status-text--error">{error}</span> : null}
      </div>
    </div>
  );
}
