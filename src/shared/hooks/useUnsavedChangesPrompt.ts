import { useEffect, useRef } from "react";
import { useBlocker } from "react-router-dom";

import { useUiStore } from "@/store";

interface UnsavedChangesPromptOptions {
  allowLeave?: boolean;
  cancelLabel?: string;
  confirmLabel?: string;
  kicker?: string;
  title?: string;
}

export function useUnsavedChangesPrompt(
  isDirty: boolean,
  message: string,
  options?: UnsavedChangesPromptOptions
): void {
  const blocker = useBlocker(isDirty);
  const showLeavePrompt = useUiStore((state) => state.showLeavePrompt);
  const clearLeavePrompt = useUiStore((state) => state.clearLeavePrompt);
  const hasShownBlockerPrompt = useRef<boolean>(false);
  const allowLeave = options?.allowLeave ?? true;

  useEffect(() => {
    if (blocker.state !== "blocked") {
      hasShownBlockerPrompt.current = false;
      clearLeavePrompt();
      return;
    }

    if (hasShownBlockerPrompt.current) {
      return;
    }

    hasShownBlockerPrompt.current = true;
    showLeavePrompt(message, {
      allowConfirm: allowLeave,
      cancelLabel: options?.cancelLabel,
      confirmLabel: options?.confirmLabel,
      kicker: options?.kicker,
      title: options?.title,
      onConfirm: () => {
        clearLeavePrompt();
        if (allowLeave) {
          blocker.proceed();
          return;
        }

        blocker.reset();
      },
      onCancel: () => {
        clearLeavePrompt();
        blocker.reset();
      }
    });
  }, [allowLeave, blocker, clearLeavePrompt, message, options?.cancelLabel, options?.confirmLabel, options?.kicker, options?.title, showLeavePrompt]);

  useEffect(() => {
    if (!isDirty) {
      return undefined;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent): void => {
      event.preventDefault();
      event.returnValue = message;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty, message]);
}
