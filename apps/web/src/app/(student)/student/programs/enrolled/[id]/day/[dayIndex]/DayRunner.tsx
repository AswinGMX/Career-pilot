"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { BlockProgressResponse, EnrollmentBlockView, EnrollmentDayView, EvidenceKind } from "@career-pilot/types";

import { completeEvidence, markBlockProgress, requestEvidenceUpload, uploadToSignedTarget } from "@/lib/api";

type ScenarioOption = { id: string; label: string; next?: string; terminal?: boolean };
type ScenarioNode = { prompt: string; options?: ScenarioOption[]; terminal?: boolean };
type ScenarioGraph = { start: string; nodes: Record<string, ScenarioNode> };

export function DayRunner({
  enrollmentId,
  day
}: {
  enrollmentId: string;
  day: EnrollmentDayView;
}): JSX.Element {
  const router = useRouter();
  const allBlocks = useMemo(() => day.modules.flatMap((module) => module.blocks), [day.modules]);

  const [states, setStates] = useState<Record<string, string>>(
    Object.fromEntries(allBlocks.map((block) => [block.id, block.state]))
  );
  const [dayCompleted, setDayCompleted] = useState(day.state === "completed");
  const [error, setError] = useState<string | null>(null);

  function applyCompletion(blockId: string, result: BlockProgressResponse): void {
    setStates((prev) => ({ ...prev, [blockId]: "completed" }));
    if (result.dayCompleted) {
      setDayCompleted(true);
      router.refresh();
    }
  }

  async function complete(blockId: string, interaction?: Record<string, unknown>): Promise<void> {
    setError(null);
    try {
      const result = await markBlockProgress(enrollmentId, blockId, "completed", interaction);
      applyCompletion(blockId, result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save progress.");
    }
  }

  const completedCount = allBlocks.filter((block) => states[block.id] === "completed").length;

  return (
    <div className="section-stack">
      <section className="surface-card">
        <p className="muted-text" style={{ margin: 0 }}>
          {completedCount} of {allBlocks.length} steps completed{dayCompleted ? " · Day complete 🎉" : ""}
        </p>
      </section>

      {day.modules.map((module) => (
        <section key={module.id} className="surface-card">
          <h2 style={{ marginTop: 0, marginBottom: 4 }}>{module.title}</h2>
          <p className="muted-text" style={{ marginTop: 0 }}>{module.type}</p>
          <div style={{ display: "grid", gap: "14px" }}>
            {module.blocks.map((block) => (
              <BlockCard
                key={block.id}
                block={block}
                enrollmentId={enrollmentId}
                done={states[block.id] === "completed"}
                onComplete={complete}
                onCompleted={applyCompletion}
                onError={setError}
              />
            ))}
          </div>
        </section>
      ))}

      {error ? (
        <section className="surface-card">
          <p style={{ margin: 0, color: "#b42318" }}>{error}</p>
        </section>
      ) : null}

      {dayCompleted ? (
        <section className="surface-card surface-card--strong">
          <p style={{ marginTop: 0 }}>
            <strong>Day complete.</strong> The next day is unlocked.
          </p>
          <Link href={`/student/programs/enrolled/${enrollmentId}`} style={ctaStyle}>
            Back to program →
          </Link>
        </section>
      ) : (
        <section className="surface-card">
          <Link href={`/student/programs/enrolled/${enrollmentId}`}>← Back to program</Link>
        </section>
      )}
    </div>
  );
}

type BlockCardProps = {
  block: EnrollmentBlockView;
  enrollmentId: string;
  done: boolean;
  onComplete: (blockId: string, interaction?: Record<string, unknown>) => Promise<void>;
  onCompleted: (blockId: string, result: BlockProgressResponse) => void;
  onError: (message: string) => void;
};

function BlockCard(props: BlockCardProps): JSX.Element {
  const { block, done, onComplete } = props;
  const body = (block.body ?? {}) as Record<string, unknown>;

  if (block.kind === "scenario") {
    return <ScenarioBlock block={block} done={done} onComplete={onComplete} />;
  }

  if (block.kind === "video" || block.kind === "audio" || block.kind === "panorama360") {
    return <MediaBlock block={block} done={done} onComplete={onComplete} />;
  }

  if (block.kind === "task_prompt") {
    const evidenceKind = body.evidenceKind;
    if (evidenceKind === "video" || evidenceKind === "audio" || evidenceKind === "image") {
      return <EvidenceUploadTask {...props} kind={evidenceKind} />;
    }
    return <TaskBlock block={block} done={done} onComplete={onComplete} />;
  }

  // text / default
  const heading = typeof body.heading === "string" ? body.heading : null;
  const markdown = typeof body.markdown === "string" ? body.markdown : null;

  return (
    <article style={blockStyle(done)}>
      {heading ? <p style={{ margin: "0 0 6px", fontWeight: 600 }}>{heading}</p> : null}
      {markdown ? <p className="muted-text" style={{ marginTop: 0 }}>{markdown}</p> : null}
      <CompleteButton done={done} label="Mark as read" onClick={() => onComplete(block.id)} />
    </article>
  );
}

/** Resolves a playable source: the signed asset URL if attached, else a body src (used by seeded demo media). */
function mediaSource(block: EnrollmentBlockView): { src: string | null; captions: string | null } {
  const body = (block.body ?? {}) as Record<string, unknown>;
  const src =
    block.media?.url ??
    (typeof body.src === "string" ? body.src : typeof body.url === "string" ? body.url : null);
  const captions =
    block.media?.captionsUrl ?? (typeof body.captionsSrc === "string" ? body.captionsSrc : null);
  return { src, captions };
}

function MediaBlock({
  block,
  done,
  onComplete
}: {
  block: EnrollmentBlockView;
  done: boolean;
  onComplete: (blockId: string, interaction?: Record<string, unknown>) => Promise<void>;
}): JSX.Element {
  const body = (block.body ?? {}) as Record<string, unknown>;
  const heading = typeof body.heading === "string" ? body.heading : null;
  const caption = typeof body.caption === "string" ? body.caption : typeof body.markdown === "string" ? body.markdown : null;
  const { src, captions } = mediaSource(block);
  const label = block.kind === "panorama360" ? "Mark as viewed" : "Mark as watched";

  return (
    <article style={blockStyle(done)}>
      {heading ? <p style={{ margin: "0 0 8px", fontWeight: 600 }}>{heading}</p> : null}

      {!src ? (
        <p className="muted-text" style={{ margin: 0 }}>Media is still processing… check back shortly.</p>
      ) : block.kind === "video" ? (
        <video
          controls
          crossOrigin={captions ? "anonymous" : undefined}
          style={{ width: "100%", borderRadius: "10px", background: "#000" }}
        >
          <source src={src} />
          {captions ? <track default kind="captions" src={captions} srcLang="en" label="English" /> : null}
        </video>
      ) : block.kind === "audio" ? (
        <audio controls style={{ width: "100%" }}>
          <source src={src} />
        </audio>
      ) : (
        <PanoramaViewer src={src} />
      )}

      {caption ? <p className="muted-text" style={{ margin: "8px 0 0" }}>{caption}</p> : null}
      <CompleteButton done={done} label={label} onClick={() => onComplete(block.id)} />
    </article>
  );
}

/**
 * Dependency-free 360 viewer: pans a wide (equirectangular) image horizontally
 * with drag, wrapping seamlessly so it reads as "looking around". A real WebGL
 * sphere projection can replace this behind the same component later.
 */
function PanoramaViewer({ src }: { src: string }): JSX.Element {
  const [posX, setPosX] = useState(0);
  const dragging = useRef<{ startX: number; startPos: number } | null>(null);

  return (
    <div
      role="img"
      aria-label="360° panorama — drag to look around"
      onPointerDown={(event) => {
        (event.target as HTMLElement).setPointerCapture(event.pointerId);
        dragging.current = { startX: event.clientX, startPos: posX };
      }}
      onPointerMove={(event) => {
        if (!dragging.current) return;
        setPosX(dragging.current.startPos + (event.clientX - dragging.current.startX));
      }}
      onPointerUp={() => {
        dragging.current = null;
      }}
      style={{
        height: "320px",
        borderRadius: "10px",
        backgroundImage: `url(${src})`,
        backgroundSize: "auto 100%",
        backgroundRepeat: "repeat-x",
        backgroundPositionX: `${posX}px`,
        cursor: "grab",
        touchAction: "none",
        userSelect: "none"
      }}
    >
      <span
        style={{
          display: "inline-block",
          margin: "12px",
          padding: "4px 10px",
          borderRadius: "999px",
          background: "rgba(0,0,0,0.55)",
          color: "#fff",
          fontSize: "12px"
        }}
      >
        ↔ Drag to look around
      </span>
    </div>
  );
}

function EvidenceUploadTask({
  block,
  enrollmentId,
  done,
  kind,
  onCompleted,
  onError
}: BlockCardProps & { kind: EvidenceKind }): JSX.Element {
  const body = (block.body ?? {}) as { prompt?: string };
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const accept = `${kind}/*`;
  const noun = kind === "video" ? "a video" : kind === "audio" ? "an audio clip" : "an image";

  async function submit(): Promise<void> {
    if (!file) return;
    setBusy(true);
    onError("");
    try {
      const init = await requestEvidenceUpload(enrollmentId, block.id, {
        mimeType: file.type || `${kind}/octet-stream`,
        kind,
        sizeBytes: file.size
      });
      await uploadToSignedTarget(init.upload, file);
      const result = await completeEvidence(enrollmentId, block.id, init.evidenceId);
      onCompleted(block.id, result);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Unable to submit evidence.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article style={blockStyle(done)}>
      <p style={{ margin: "0 0 8px", fontWeight: 600 }}>{body.prompt ?? "Submit your evidence"}</p>
      {done ? (
        <p style={{ margin: "10px 0 0", color: "#067647", fontWeight: 600 }}>✓ Evidence submitted</p>
      ) : (
        <>
          <p className="muted-text" style={{ marginTop: 0 }}>Upload {noun} as your response.</p>
          <input
            type="file"
            accept={accept}
            disabled={busy}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <CompleteButton
            done={false}
            label={busy ? "Uploading…" : "Upload & complete"}
            onClick={() => {
              if (!busy && file) void submit();
            }}
          />
          {!file ? <p className="muted-text" style={{ margin: "8px 0 0", fontSize: "13px" }}>Choose a file to enable upload.</p> : null}
        </>
      )}
    </article>
  );
}

function TaskBlock({
  block,
  done,
  onComplete
}: {
  block: EnrollmentBlockView;
  done: boolean;
  onComplete: (blockId: string, interaction?: Record<string, unknown>) => Promise<void>;
}): JSX.Element {
  const MIN_CHARS = 40;
  const body = (block.body ?? {}) as { prompt?: string };
  const [response, setResponse] = useState(
    typeof (block.interaction as { response?: string })?.response === "string"
      ? String((block.interaction as { response?: string }).response)
      : ""
  );
  const trimmed = response.trim();
  const tooShort = trimmed.length < MIN_CHARS;

  return (
    <article style={blockStyle(done)}>
      <p style={{ margin: "0 0 8px", fontWeight: 600 }}>{body.prompt ?? "Reflection"}</p>
      <textarea
        value={response}
        onChange={(event) => setResponse(event.target.value)}
        disabled={done}
        rows={3}
        placeholder="Write your response…"
        style={{ width: "100%", borderRadius: "10px", border: "1px solid #d0d5dd", padding: "10px", fontFamily: "inherit" }}
      />
      {!done ? (
        <p className="muted-text" style={{ margin: "4px 0 0", fontSize: "12px", color: tooShort ? "#b42318" : "#067647" }}>
          {tooShort ? `Write at least ${MIN_CHARS} characters (${trimmed.length}/${MIN_CHARS}).` : `${trimmed.length} characters ✓`}
        </p>
      ) : null}
      {done ? (
        <p style={{ margin: "10px 0 0", color: "#067647", fontWeight: 600 }}>✓ Completed</p>
      ) : (
        <button
          type="button"
          onClick={() => {
            if (!tooShort) void onComplete(block.id, { response: trimmed });
          }}
          disabled={tooShort}
          style={{
            ...ctaStyle,
            marginTop: "10px",
            border: 0,
            cursor: tooShort ? "not-allowed" : "pointer",
            opacity: tooShort ? 0.5 : 1
          }}
        >
          Submit & complete
        </button>
      )}
    </article>
  );
}

function ScenarioBlock({
  block,
  done,
  onComplete
}: {
  block: EnrollmentBlockView;
  done: boolean;
  onComplete: (blockId: string, interaction?: Record<string, unknown>) => Promise<void>;
}): JSX.Element {
  const graph = (block.body as { scenario?: ScenarioGraph })?.scenario;
  const [nodeKey, setNodeKey] = useState<string>(graph?.start ?? "");
  const [choices, setChoices] = useState<string[]>([]);

  if (!graph || !graph.nodes[nodeKey]) {
    return (
      <article style={blockStyle(done)}>
        <p style={{ margin: 0 }}>Interactive scenario.</p>
        <CompleteButton done={done} label="Complete" onClick={() => onComplete(block.id)} />
      </article>
    );
  }

  const node = graph.nodes[nodeKey];
  const isTerminal = node.terminal || !node.options || node.options.length === 0;

  return (
    <article style={blockStyle(done)}>
      <p style={{ margin: "0 0 10px", fontWeight: 600 }}>{node.prompt}</p>
      {!done && !isTerminal ? (
        <div style={{ display: "grid", gap: "8px" }}>
          {node.options?.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                setChoices((prev) => [...prev, option.id]);
                if (option.next && graph.nodes[option.next]) {
                  setNodeKey(option.next);
                } else {
                  void onComplete(block.id, { choices: [...choices, option.id] });
                }
              }}
              style={optionStyle}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
      {!done && isTerminal ? (
        <CompleteButton done={done} label="Finish scenario" onClick={() => onComplete(block.id, { choices })} />
      ) : null}
    </article>
  );
}

function CompleteButton({
  done,
  label,
  onClick
}: {
  done: boolean;
  label: string;
  onClick: () => void;
}): JSX.Element {
  if (done) {
    return <p style={{ margin: "10px 0 0", color: "#067647", fontWeight: 600 }}>✓ Completed</p>;
  }
  return (
    <button type="button" onClick={onClick} style={{ ...ctaStyle, marginTop: "10px", border: 0, cursor: "pointer" }}>
      {label}
    </button>
  );
}

function blockStyle(done: boolean) {
  return {
    border: `1px solid ${done ? "#aee9c9" : "rgba(24, 32, 56, 0.1)"}`,
    background: done ? "#f3fdf7" : "#fff",
    borderRadius: "12px",
    padding: "16px"
  } as const;
}

const ctaStyle = {
  display: "inline-block",
  borderRadius: "999px",
  padding: "10px 16px",
  background: "linear-gradient(135deg, #6d5efc, #9b6bf8)",
  color: "#fff",
  textDecoration: "none"
} as const;

const optionStyle = {
  textAlign: "left",
  border: "1px solid #d0d5dd",
  borderRadius: "10px",
  padding: "12px 14px",
  background: "#fff",
  cursor: "pointer"
} as const;
