"use client";

import { useEffect, useRef, useState } from "react";

import { getMentorStudents, getMyMentors } from "@/lib/api";

import { MentorChat } from "./mentor-chat";

type Convo = { requestId: string; name: string; subtitle: string; lastMessageAt: string | null };

const SEEN_KEY = "cp_chat_seen";
const POS_KEY = "cp_chat_fab_pos";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export function FloatingChat({ role }: { role: "student" | "mentor" }): JSX.Element {
  const [open, setOpen] = useState(false);
  const [convos, setConvos] = useState<Convo[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [seen, setSeen] = useState<Record<string, string>>({});
  const [pos, setPos] = useState<{ right: number; bottom: number }>({ right: 24, bottom: 24 });
  const posRef = useRef(pos);
  const drag = useRef<{ x: number; y: number; right: number; bottom: number } | null>(null);
  const moved = useRef(false);

  useEffect(() => {
    setSeen(readJson<Record<string, string>>(SEEN_KEY, {}));
    const savedPos = readJson<{ right: number; bottom: number } | null>(POS_KEY, null);
    if (savedPos) {
      setPos(savedPos);
      posRef.current = savedPos;
    }
  }, []);

  async function loadConvos(): Promise<void> {
    if (role === "mentor") {
      const res = await getMentorStudents();
      setConvos(
        res.students.map((s) => ({ requestId: s.requestId, name: s.fullName, subtitle: s.email, lastMessageAt: s.lastMessageAt }))
      );
    } else {
      const res = await getMyMentors();
      setConvos(
        res.mentors
          .filter((m) => m.status === "accepted")
          .map((m) => ({ requestId: m.requestId, name: m.fullName, subtitle: m.headline ?? "Mentor", lastMessageAt: m.lastMessageAt }))
      );
    }
  }

  useEffect(() => {
    void loadConvos();
    const timer = setInterval(() => void loadConvos(), 15000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  function isUnread(c: Convo): boolean {
    if (!c.lastMessageAt) return false;
    const s = seen[c.requestId];
    return !s || new Date(c.lastMessageAt) > new Date(s);
  }
  const unreadCount = convos.filter(isUnread).length;
  const active = convos.find((c) => c.requestId === activeId) ?? null;

  function markSeen(requestId: string): void {
    const next = { ...readJson<Record<string, string>>(SEEN_KEY, {}), [requestId]: new Date().toISOString() };
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(next));
    setSeen(next);
  }

  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>): void {
    drag.current = { x: e.clientX, y: e.clientY, right: posRef.current.right, bottom: posRef.current.bottom };
    moved.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent<HTMLButtonElement>): void {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) moved.current = true;
    const next = {
      right: Math.min(Math.max(8, drag.current.right - dx), window.innerWidth - 72),
      bottom: Math.min(Math.max(8, drag.current.bottom - dy), window.innerHeight - 72)
    };
    posRef.current = next;
    setPos(next);
  }
  function onPointerUp(): void {
    if (drag.current) {
      window.localStorage.setItem(POS_KEY, JSON.stringify(posRef.current));
      drag.current = null;
    }
  }
  function onClick(): void {
    if (moved.current) return;
    setOpen((o) => !o);
  }

  return (
    <>
      {open ? (
        <div className="cp-chat-pop" style={{ right: pos.right, bottom: pos.bottom + 76 }}>
          <header className="cp-chat-pop-head">
            {active ? (
              <button type="button" className="cp-chat-back" onClick={() => setActiveId(null)} aria-label="Back">‹</button>
            ) : null}
            <span className="cp-chat-pop-title">{active ? active.name : "Messages"}</span>
            <button type="button" className="cp-chat-close" onClick={() => setOpen(false)} aria-label="Close">✕</button>
          </header>

          {active ? (
            <div className="cp-chat-pop-body">
              <MentorChat key={active.requestId} requestId={active.requestId} maxHeight={300} />
            </div>
          ) : (
            <div className="cp-chat-pop-list">
              {convos.length === 0 ? (
                <p className="cp-chat-empty">
                  {role === "mentor" ? "No connected students yet." : "Request a mentor to start chatting."}
                </p>
              ) : (
                convos.map((c) => (
                  <button
                    key={c.requestId}
                    type="button"
                    className="cp-chat-row"
                    onClick={() => {
                      markSeen(c.requestId);
                      setActiveId(c.requestId);
                    }}
                  >
                    <span className="cp-chat-avatar">{initials(c.name)}</span>
                    <span className="cp-chat-row-text">
                      <span className="cp-chat-row-name">{c.name}</span>
                      <span className="cp-chat-row-sub">{c.subtitle}</span>
                    </span>
                    <span className="cp-chat-row-meta">
                      <span className="cp-chat-row-time">{timeAgo(c.lastMessageAt)}</span>
                      {isUnread(c) ? <span className="cp-chat-row-dot" /> : null}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      ) : null}

      <button
        type="button"
        className="cp-fab"
        style={{ right: pos.right, bottom: pos.bottom }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={onClick}
        aria-label="Messages"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
        {unreadCount > 0 ? <span className="cp-fab-badge">{unreadCount}</span> : null}
      </button>
    </>
  );
}
