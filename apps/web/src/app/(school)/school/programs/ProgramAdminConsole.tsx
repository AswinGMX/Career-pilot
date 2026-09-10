"use client";

import { useCallback, useEffect, useState } from "react";

import type { ProgramAdminSummary } from "@career-pilot/types";

import { adminCreateProgram, adminGenerateDraft, adminListPrograms, adminPublishVersion } from "@/lib/api";

export function ProgramAdminConsole(): JSX.Element {
  const [programs, setPrograms] = useState<ProgramAdminSummary[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ slug: "", title: "", summary: "" });

  const refresh = useCallback(async () => {
    const { programs: list } = await adminListPrograms();
    setPrograms(list);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function run(action: () => Promise<unknown>): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await action();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="section-stack">
      <section className="surface-card">
        <h2 style={{ marginTop: 0 }}>Create a program</h2>
        <div style={{ display: "grid", gap: "8px", maxWidth: "520px" }}>
          <input
            placeholder="slug (e.g. data-analyst-reality)"
            value={form.slug}
            onChange={(event) => setForm({ ...form, slug: event.target.value })}
            style={inputStyle}
          />
          <input
            placeholder="Title"
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            style={inputStyle}
          />
          <input
            placeholder="Summary"
            value={form.summary}
            onChange={(event) => setForm({ ...form, summary: event.target.value })}
            style={inputStyle}
          />
          <button
            type="button"
            disabled={busy || !form.slug || !form.title || !form.summary}
            onClick={() => run(async () => {
              await adminCreateProgram(form);
              setForm({ slug: "", title: "", summary: "" });
            })}
            style={primaryBtn}
          >
            Create program
          </button>
        </div>
        {error ? <p style={{ color: "#b42318", margin: "8px 0 0" }}>{error}</p> : null}
      </section>

      <section className="surface-card">
        <h2 style={{ marginTop: 0 }}>Programs</h2>
        {programs.length === 0 ? (
          <p className="muted-text" style={{ margin: 0 }}>No programs yet. Create one above.</p>
        ) : (
          <div style={{ display: "grid", gap: "12px" }}>
            {programs.map((program) => {
              const latestDraft = program.versions.find((version) => version.state !== "published");
              return (
                <div key={program.id} style={{ border: "1px solid rgba(24, 32, 56, 0.1)", borderRadius: "12px", padding: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                    <div>
                      <strong>{program.title}</strong>
                      <p className="muted-text" style={{ margin: "4px 0 0" }}>
                        {program.slug} · {program.status} ·{" "}
                        {program.versions.length} version{program.versions.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <button type="button" disabled={busy} onClick={() => run(() => adminGenerateDraft(program.id, 7))} style={secondaryBtn}>
                        Generate AI draft
                      </button>
                      {latestDraft ? (
                        <button type="button" disabled={busy} onClick={() => run(() => adminPublishVersion(latestDraft.id))} style={primaryBtn}>
                          Publish v{latestDraft.version}
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {program.versions.length ? (
                    <p className="muted-text" style={{ margin: "10px 0 0", fontSize: "13px" }}>
                      {program.versions.map((version) => `v${version.version} (${version.state}, ${version.durationDays}d)`).join(" · ")}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

const inputStyle = {
  borderRadius: "10px",
  border: "1px solid #d0d5dd",
  padding: "10px 12px",
  fontFamily: "inherit"
} as const;

const primaryBtn = {
  border: 0,
  borderRadius: "999px",
  padding: "10px 16px",
  background: "linear-gradient(135deg, #6d5efc, #9b6bf8)",
  color: "#fff",
  cursor: "pointer"
} as const;

const secondaryBtn = {
  border: "1px solid #5340d6",
  borderRadius: "999px",
  padding: "10px 16px",
  background: "#fff",
  color: "#5340d6",
  cursor: "pointer"
} as const;
