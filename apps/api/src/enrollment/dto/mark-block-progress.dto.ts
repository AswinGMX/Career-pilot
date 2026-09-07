import { IsIn, IsObject, IsOptional } from "class-validator";

export class MarkBlockProgressDto {
  @IsIn(["in_progress", "completed"])
  state!: "in_progress" | "completed";

  @IsOptional()
  @IsObject()
  interaction?: Record<string, unknown>;
}
