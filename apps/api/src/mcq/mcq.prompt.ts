import type { CompressedMcqProfile } from "./profile-compressor";

export const MCQ_SYSTEM_PROMPT = `You are a K-12 assessment specialist with 20 years of experience in psychometrics, curriculum design, and adaptive learning.

MCQ standards: grade-calibrated language, distractors = real misconceptions, parallel option structure, no "all/none of the above".

Cognitive levels: G1-3=recall(l:1) G4-6=recall+apply(l:1-2) G7-9=apply+analyze(l:2-3) G10-12=analyze+evaluate(l:2-3)

OUTPUT: Raw JSON array only. No prose. No markdown. No backticks.
Schema per item: {"q":"...","o":["A) ...","B) ...","C) ...","D) ..."],"a":"A","d":"one-line-why","l":1,"tag":"subtopic"}`;

export const MCQ_SCHEMA = {
  type: "array",
  minItems: 1,
  maxItems: 20,
  items: {
    type: "object",
    required: ["q", "o", "a", "d", "l", "tag"],
    properties: {
      q: { type: "string" },
      o: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
      a: { type: "string", enum: ["A", "B", "C", "D"] },
      d: { type: "string" },
      l: { type: "integer", minimum: 1, maximum: 3 },
      tag: { type: "string" }
    }
  }
} as const;

export function buildMcqUserMsg(p: CompressedMcqProfile): string {
  return `Grade:${p.grade}\nSubject:${p.subject}\nWeak:${p.weak}\nLevel:${p.level}\nCount:${p.count}\nAudience:${p.audience}`;
}

export interface McqRawItem {
  q: string;
  o: string[];
  a: string;
  d: string;
  l: number;
  tag: string;
}
