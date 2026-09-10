import { Global, Module } from "@nestjs/common";

import { GeminiService } from "./gemini.service";
import { GroqService } from "./groq.service";
import { LlmService } from "./llm.service";

@Global()
@Module({
  providers: [GeminiService, GroqService, LlmService],
  exports: [GeminiService, GroqService, LlmService]
})
export class AiModule {}
