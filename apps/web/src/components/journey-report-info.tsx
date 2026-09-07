"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface JourneyDialogStep {
  label: string;
  status: string;
  state: "done" | "active" | "pending";
  href: string;
  description: string;
}

/**
 * "i" affordance at the top-right of the journey stepper. Opens the full
 * journey (all milestones, statuses, and quick links) as a dialog.
 */
export function JourneyDialog({ steps }: { steps: JourneyDialogStep[] }): JSX.Element {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onKey(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="journey-info-btn"
        aria-label="View full journey"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11.4v4.6" />
          <path d="M12 8h.01" />
        </svg>
      </button>

      {open ? (
        <div className="rf-modal-overlay" role="presentation" onClick={() => setOpen(false)}>
          <div
            className="rf-modal rf-modal--journey"
            role="dialog"
            aria-modal="true"
            aria-labelledby="journey-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="rf-modal__head">
              <div>
                <p className="app-eyebrow" style={{ margin: "0 0 4px" }}>
                  Your journey
                </p>
                <h2 id="journey-dialog-title" style={{ margin: 0, fontSize: "1.3rem" }}>
                  The whole arc
                </h2>
              </div>
              <button type="button" className="rf-modal__close" aria-label="Close" onClick={() => setOpen(false)}>
                ×
              </button>
            </div>

            <p className="muted-text" style={{ marginTop: 0, marginBottom: 16 }}>
              Four milestones from profile to a shareable report. Each one unlocks the next — pick up wherever you
              left off.
            </p>

            <ol className="rf-journey-list">
              {steps.map((step, index) => (
                <li key={step.href} className={`rf-journey-item rf-journey-item--${step.state}`}>
                  <span className="rf-journey-bullet" aria-hidden="true">
                    {step.state === "done" ? "✓" : index + 1}
                  </span>
                  <div className="rf-journey-body">
                    <div className="rf-journey-row">
                      <strong>{step.label}</strong>
                      <span className="rf-journey-status">{step.status}</span>
                    </div>
                    <p className="muted-text" style={{ margin: "2px 0 8px", fontSize: "13.5px", lineHeight: 1.55 }}>
                      {step.description}
                    </p>
                    <Link href={step.href} className="rf-journey-link" onClick={() => setOpen(false)}>
                      Go to {step.label} →
                    </Link>
                  </div>
                </li>
              ))}
            </ol>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: 18 }}>
              <Link className="button-primary" href="/student/journey" onClick={() => setOpen(false)}>
                Open full journey page
              </Link>
              <button type="button" className="button-secondary" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
