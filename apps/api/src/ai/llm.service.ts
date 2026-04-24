import { Injectable, Logger } from "@nestjs/common";

import { GeminiService } from "./gemini.service";
import { GroqService } from "./groq.service";

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  constructor(
    private readonly groqService: GroqService,
    private readonly geminiService: GeminiService
  ) {}

  isConfigured(): boolean {
    return this.groqService.isConfigured() || this.geminiService.isConfigured();
  }

  async generateStructuredJson<T>(input: {
    systemInstruction: string;
    prompt: string;
    schema: Record<string, unknown>;
    temperature?: number;
  }): Promise<T | null> {
    if (this.groqService.isConfigured()) {
      try {
        const result = await this.groqService.generateStructuredJson<T>(input);
        if (result !== null) {
          return result;
        }
      } catch (err) {
        this.logger.warn(`Groq failed, falling back to Gemini: ${(err as Error)?.message || err}`);
      }
    }

    if (this.geminiService.isConfigured()) {
      try {
        return await this.geminiService.generateStructuredJson<T>(input);
      } catch (err) {
        this.logger.error(`Gemini fallback also failed: ${(err as Error)?.message || err}`);
        return null;
      }
    }

    return null;
  }
}
