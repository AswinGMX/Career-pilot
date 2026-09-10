import { Injectable, Logger } from "@nestjs/common";

import { GeminiService } from "./gemini.service";
import { GroqService } from "./groq.service";

/** Per-provider circuit-breaker state (in-memory; Redis-backed for cross-instance). */
interface BreakerState {
  failures: number;
  openUntil: number;
}

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  /** Consecutive failures before a provider's circuit opens. */
  private static readonly FAILURE_THRESHOLD = Number(process.env.AI_BREAKER_THRESHOLD || 5);
  /** How long a tripped circuit stays open before a trial call. */
  private static readonly COOLDOWN_MS = Number(process.env.AI_BREAKER_COOLDOWN_MS || 30_000);
  /** Cost guard: skip the LLM (use deterministic fallback) for oversized prompts. */
  private static readonly MAX_PROMPT_CHARS = Number(process.env.AI_MAX_PROMPT_CHARS || 24_000);

  private readonly breakers = new Map<string, BreakerState>();

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
    // Cost guard: reject runaway prompts before they hit a metered provider.
    const promptChars = input.systemInstruction.length + input.prompt.length;
    if (promptChars > LlmService.MAX_PROMPT_CHARS) {
      this.logger.warn(
        `Prompt of ${promptChars} chars exceeds AI_MAX_PROMPT_CHARS (${LlmService.MAX_PROMPT_CHARS}); using fallback.`
      );
      return null;
    }

    const groqResult = await this.tryProvider("groq", this.groqService, input);
    if (groqResult !== null) {
      return groqResult as T;
    }
    const geminiResult = await this.tryProvider("gemini", this.geminiService, input);
    return geminiResult as T | null;
  }

  private async tryProvider<T>(
    name: string,
    provider: GroqService | GeminiService,
    input: { systemInstruction: string; prompt: string; schema: Record<string, unknown>; temperature?: number }
  ): Promise<T | null> {
    if (!provider.isConfigured()) {
      return null;
    }
    if (this.isOpen(name)) {
      this.logger.warn(`${name} circuit is open; skipping call.`);
      return null;
    }
    try {
      const result = await provider.generateStructuredJson<T>(input);
      this.recordSuccess(name);
      return result;
    } catch (err) {
      this.recordFailure(name);
      this.logger.warn(`${name} call failed: ${(err as Error)?.message || err}`);
      return null;
    }
  }

  private isOpen(name: string): boolean {
    const state = this.breakers.get(name);
    return !!state && state.openUntil > Date.now();
  }

  private recordSuccess(name: string): void {
    this.breakers.set(name, { failures: 0, openUntil: 0 });
  }

  private recordFailure(name: string): void {
    const state = this.breakers.get(name) ?? { failures: 0, openUntil: 0 };
    state.failures += 1;
    if (state.failures >= LlmService.FAILURE_THRESHOLD) {
      state.openUntil = Date.now() + LlmService.COOLDOWN_MS;
      state.failures = 0;
      this.logger.error(`${name} circuit opened for ${LlmService.COOLDOWN_MS}ms after repeated failures.`);
    }
    this.breakers.set(name, state);
  }
}
