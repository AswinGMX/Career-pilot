import { Injectable, Logger } from "@nestjs/common";

const defaultModel = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const endpoint = "https://api.groq.com/openai/v1/chat/completions";

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
export class GroqService {
  private readonly logger = new Logger(GroqService.name);

  isConfigured(): boolean {
    return Boolean(process.env.GROQ_API_KEY);
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

    const maxRetries = 3;
    const retryDelays = [1500, 4000];
    const hasSchema = schema && Object.keys(schema).length > 0;

    const systemContent =
      systemInstruction +
      " You MUST respond with valid JSON only, no markdown, no explanation." +
      (hasSchema ? `\n\nMatch this JSON schema:\n${JSON.stringify(schema)}` : "");

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY || ""}`
        },
        body: JSON.stringify({
          model: defaultModel,
          messages: [
            { role: "system", content: systemContent },
            { role: "user", content: prompt }
          ],
          temperature,
          response_format: { type: "json_object" }
        })
      });

      const isRetryable = [429, 500, 502, 503, 504].includes(response.status);

      if (isRetryable && attempt < maxRetries - 1) {
        const waitMs = retryDelays[attempt];
        this.logger.warn(`Groq ${response.status} on attempt ${attempt + 1}, retrying in ${waitMs / 1000}s...`);
        await sleep(waitMs);
        continue;
      }

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Groq request failed with status ${response.status}: ${body}`);
      }

      const payload = (await response.json()) as {
        choices?: Array<{
          message?: { role?: string; content?: string };
        }>;
      };

      const text = payload.choices?.[0]?.message?.content?.trim();

      if (!text) {
        throw new Error("Groq returned an empty response.");
      }

      const cleaned = stripCodeFences(text);

      if (!cleaned.startsWith("{") && !cleaned.startsWith("[")) {
        this.logger.error(`Groq returned non-JSON: ${cleaned.slice(0, 200)}`);
        throw new Error("Groq returned non-JSON response.");
      }

      return JSON.parse(cleaned) as T;
    }

    throw new Error("Groq unavailable after retries.");
  }
}
