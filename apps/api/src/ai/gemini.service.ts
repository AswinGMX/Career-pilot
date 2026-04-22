import { Injectable } from "@nestjs/common";

const defaultModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";

function stripCodeFences(text: string): string {
  return String(text || "")
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class GeminiService {
  isConfigured(): boolean {
    return Boolean(process.env.GEMINI_API_KEY);
  }

  async generateStructuredJson<T>({
    systemInstruction,
    prompt,
    schema,
    temperature = 0.7
  }: {
    systemInstruction: string;
    prompt: string;
    schema: Record<string, unknown>;
    temperature?: number;
  }): Promise<T | null> {
    if (!this.isConfigured()) {
      return null;
    }

    const maxRetries = 4;
    const retryDelays = [5000, 15000, 30000, 45000];
    const hasSchema = schema && Object.keys(schema).length > 0;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${defaultModel}:generateContent`;

      const fullPrompt = hasSchema
        ? `${prompt}\n\nRespond with valid JSON matching this schema:\n${JSON.stringify(schema, null, 2)}`
        : prompt;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY || ""
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemInstruction + " You MUST respond with valid JSON only, no markdown, no explanation." }]
          },
          contents: [
            {
              role: "user",
              parts: [{ text: fullPrompt }]
            }
          ],
          generationConfig: {
            temperature
          }
        })
      });

      if ((response.status === 503 || response.status === 429) && attempt < maxRetries - 1) {
        const waitMs = retryDelays[attempt];
        console.warn(`Gemini ${response.status} on attempt ${attempt + 1}, retrying in ${waitMs / 1000}s...`);
        await sleep(waitMs);
        continue;
      }

      if (!response.ok) {
        throw new Error(`Gemini request failed with status ${response.status}: ${await response.text()}`);
      }

      const payload = (await response.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{ text?: string }>;
          };
        }>;
      };

      const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();

      if (!text) {
        throw new Error("Gemini returned an empty response.");
      }

      const cleaned = stripCodeFences(text);

      if (!cleaned.startsWith("{") && !cleaned.startsWith("[")) {
        console.error("Gemini returned non-JSON:", cleaned.slice(0, 200));
        throw new Error("Gemini returned non-JSON response.");
      }

      return JSON.parse(cleaned) as T;
    }

    throw new Error("Gemini unavailable after retries.");
  }
}
