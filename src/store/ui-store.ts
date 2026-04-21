import { create } from "zustand";

import type { NoticeState, NoticeTone } from "@/shared/types";

interface LeavePromptState {
  kicker?: string;
  message: string;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  allowConfirm?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

interface UiState {
  notice: NoticeState | null;
  leavePrompt: LeavePromptState | null;
  showNotice: (message: string, tone?: NoticeTone) => void;
  clearNotice: () => void;
  showLeavePrompt: (
    message: string,
    handlers: Pick<LeavePromptState, "onConfirm" | "onCancel"> & Omit<Partial<LeavePromptState>, "message">
  ) => void;
  clearLeavePrompt: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  notice: null,
  leavePrompt: null,
  showNotice: (message, tone = "info") =>
    set(() => ({
      notice: {
        id: crypto.randomUUID(),
        message,
        tone
      }
    })),
  clearNotice: () =>
    set(() => ({
      notice: null
    })),
  showLeavePrompt: (message, handlers) =>
    set(() => ({
      leavePrompt: {
        allowConfirm: handlers.allowConfirm,
        cancelLabel: handlers.cancelLabel,
        confirmLabel: handlers.confirmLabel,
        kicker: handlers.kicker,
        message,
        title: handlers.title,
        onConfirm: handlers.onConfirm,
        onCancel: handlers.onCancel
      }
    })),
  clearLeavePrompt: () =>
    set(() => ({
      leavePrompt: null
    }))
}));
