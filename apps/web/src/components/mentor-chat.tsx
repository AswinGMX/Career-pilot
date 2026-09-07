"use client";

import { useEffect, useRef, useState } from "react";

import type { MentorMessageRecord } from "@career-pilot/types";

import { getMentorMessages, sendMentorMessage } from "@/lib/api";

export function MentorChat({ requestId, maxHeight = 320 }: { requestId: string; maxHeight?: number }): JSX.Element {
  const [messages, setMessages] = useState<MentorMessageRecord[]>([]);
  const [viewerUserId, setViewerUserId] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  async function load(): Promise<void> {
    const res = await getMentorMessages(requestId);
    setMessages(res.messages);
    setViewerUserId(res.viewerUserId);
  }

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 8000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send(): Promise<void> {
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    setError(null);
    try {
      const res = await sendMentorMessage(requestId, body);
      setMessages(res.messages);
      setViewerUserId(res.viewerUserId);
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: "10px" }}>
      <div
        style={{
          height: `${maxHeight}px`,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          padding: "4px"
        }}
      >
        {messages.length === 0 ? (
          <p className="muted-text" style={{ margin: 0 }}>No messages yet. Say hello 👋</p>
        ) : (
          messages.map((message) => {
            const mine = message.senderUserId === viewerUserId;
            return (
              <div
                key={message.id}
                style={{
                  alignSelf: mine ? "flex-end" : "flex-start",
                  maxWidth: "78%",
                  background: mine ? "linear-gradient(135deg, #7c5cfc, #9b6bf8)" : "#eef1f5",
                  color: mine ? "#fff" : "#1f2937",
                  borderRadius: "14px",
                  padding: "8px 12px",
                  fontSize: "14px"
                }}
              >
                {message.body}
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>
      <div style={{ display: "flex", gap: "8px", borderTop: "1px solid #e3e5ea", paddingTop: "10px" }}>
        <input
          className="field-control"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !sending) void send();
          }}
          placeholder="Write a message…"
          style={{ flex: 1, border: "1px solid #d0d5dd", borderRadius: "10px", padding: "10px 12px" }}
        />
        <button type="button" className="button-primary" disabled={sending || !draft.trim()} onClick={() => void send()}>
          {sending ? "…" : "Send"}
        </button>
      </div>
      {error ? <p className="status-text--error" style={{ margin: 0 }}>{error}</p> : null}
    </div>
  );
}
