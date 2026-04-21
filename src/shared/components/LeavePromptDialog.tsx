import { useEffect, useRef } from "react";

import { useUiStore } from "@/store";

import { Button } from "./Button";

export function LeavePromptDialog(): JSX.Element | null {
  const leavePrompt = useUiStore((state) => state.leavePrompt);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const title = leavePrompt?.title || "Leave this page?";
  const kicker = leavePrompt?.kicker || "Unsaved changes";
  const cancelLabel = leavePrompt?.cancelLabel || "Stay here";
  const confirmLabel = leavePrompt?.confirmLabel || "Leave page";
  const allowConfirm = leavePrompt?.allowConfirm ?? true;
  const cancelVariant = allowConfirm ? "secondary" : "primary";

  useEffect(() => {
    if (!leavePrompt) {
      return;
    }

    cancelButtonRef.current?.focus();
  }, [leavePrompt]);

  useEffect(() => {
    if (!leavePrompt) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        leavePrompt.onCancel();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [leavePrompt]);

  if (!leavePrompt) {
    return null;
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <div
        aria-describedby="leave-prompt-description"
        aria-labelledby="leave-prompt-title"
        aria-modal="true"
        className="dialog-panel"
        role="alertdialog"
      >
        <div className="dialog-copy">
          <p className="eyebrow dialog-kicker">{kicker}</p>
          <h2 id="leave-prompt-title">{title}</h2>
          <p id="leave-prompt-description">{leavePrompt.message}</p>
        </div>
        <div className="actions dialog-actions">
          <Button ref={cancelButtonRef} variant={cancelVariant} onClick={leavePrompt.onCancel}>
            {cancelLabel}
          </Button>
          {allowConfirm ? (
            <Button variant="primary" onClick={leavePrompt.onConfirm}>
              {confirmLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
