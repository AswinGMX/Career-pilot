"use client";

import { useState } from "react";

import { MentorChat } from "@/components/mentor-chat";

type Conversation = { requestId: string; name: string; subtitle: string };

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function MessagesWorkspace({ conversations }: { conversations: Conversation[] }): JSX.Element {
  const [selectedId, setSelectedId] = useState<string | null>(conversations[0]?.requestId ?? null);

  if (conversations.length === 0) {
    return (
      <div className="surface-card">
        <p className="muted-text" style={{ margin: 0 }}>
          No conversations yet. Once you accept a student, you can message them here.
        </p>
      </div>
    );
  }

  const selected = conversations.find((c) => c.requestId === selectedId) ?? conversations[0];

  return (
    <div className="chat-shell">
      <aside className="chat-list">
        {conversations.map((conversation) => {
          const active = conversation.requestId === selected.requestId;
          return (
            <button
              key={conversation.requestId}
              type="button"
              className={`chat-list-item${active ? " chat-list-item--active" : ""}`}
              onClick={() => setSelectedId(conversation.requestId)}
            >
              <span className="chat-avatar">{initials(conversation.name)}</span>
              <span className="chat-list-text">
                <span className="chat-list-name">{conversation.name}</span>
                <span className="chat-list-sub">{conversation.subtitle}</span>
              </span>
            </button>
          );
        })}
      </aside>

      <section className="chat-panel">
        <header className="chat-panel-header">
          <span className="chat-avatar">{initials(selected.name)}</span>
          <div>
            <div className="chat-panel-name">{selected.name}</div>
            <div className="chat-list-sub">{selected.subtitle}</div>
          </div>
        </header>
        <div className="chat-panel-body">
          <MentorChat key={selected.requestId} requestId={selected.requestId} maxHeight={460} />
        </div>
      </section>
    </div>
  );
}
