"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { ProofSessionRecord } from "@career-pilot/types";

import { submitProofSessionAnswers } from "@/lib/api";

export function ProofSessionForm({ session }: { session: ProofSessionRecord }): JSX.Element {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayQuestions = useMemo(() => {
    if (!session?.questionSet?.questions) return [];
    return session.questionSet.questions.map((question) => ({
      ...question,
      shuffledOptions: question.options
        .map((text, originalIndex) => ({ text, originalIndex }))
        .sort(() => Math.random() - 0.5)
    }));
  }, [session.id]);

  const handleSelect = (questionId: string, optionIndex: number) => {
    setAnswers((current) => ({
      ...current,
      [questionId]: optionIndex
    }));
  };

  const handleSubmit = async () => {
    if (session.questionSet.questions.some((question) => typeof answers[question.id] !== "number")) {
      setError("Answer all questions before submitting.");
      return;
    }

    setPending(true);
    setError(null);

    try {
      await submitProofSessionAnswers(session.id, {
        answers: session.questionSet.questions.map((question) => ({
          questionId: question.id,
          optionIndex: answers[question.id]
        }))
      });
      router.refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to submit proof session.");
    } finally {
      setPending(false);
    }
  };

  return (
    <section style={{ display: "grid", gap: "18px" }}>
      {displayQuestions.map((question, index) => (
        <article key={question.id} style={{ background: "#fff", border: "1px solid #d8e1eb", borderRadius: "14px", padding: "18px" }}>
          <p style={{ margin: 0, fontSize: "12px", color: "#4b6480", textTransform: "uppercase" }}>
            Question {index + 1} • {question.dimension}
          </p>
          <h2 style={{ margin: "10px 0 8px", fontSize: "22px" }}>{question.question}</h2>
          <p style={{ margin: 0, color: "#4b6480" }}>{question.whyItMatters}</p>
          <div style={{ marginTop: "16px", display: "grid", gap: "10px" }}>
            {question.shuffledOptions.map(({ text, originalIndex }) => {
              const selected = answers[question.id] === originalIndex;

              return (
                <button
                  key={originalIndex}
                  type="button"
                  onClick={() => handleSelect(question.id, originalIndex)}
                  style={{
                    textAlign: "left",
                    padding: "12px 14px",
                    borderRadius: "10px",
                    border: selected ? "2px solid #142033" : "1px solid #c6d4e1",
                    background: selected ? "#eef4fa" : "#fff",
                    cursor: "pointer"
                  }}
                >
                  {text}
                </button>
              );
            })}
          </div>
        </article>
      ))}

      <div style={{ display: "grid", gap: "10px" }}>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={pending}
          style={{
            width: "fit-content",
            padding: "12px 16px",
            borderRadius: "10px",
            border: 0,
            background: pending ? "#6e8094" : "#142033",
            color: "#fff",
            cursor: pending ? "progress" : "pointer"
          }}
        >
          {pending ? "Submitting proof..." : "Submit proof session"}
        </button>
        {error ? <p style={{ margin: 0, color: "#9f2d2d" }}>{error}</p> : null}
      </div>
    </section>
  );
}
