import { IsIn, IsInt, IsOptional, IsPositive, IsString, MinLength } from "class-validator";

/** Initialises an evidence upload for a task block (student-side). */
export class CreateEvidenceDto {
  @IsString()
  @MinLength(1)
  mimeType!: string;

  @IsOptional()
  @IsIn(["video", "audio", "image"])
  kind?: "video" | "audio" | "image";

  /** Declared file size in bytes; validated against the per-kind ceiling at init. */
  @IsOptional()
  @IsInt()
  @IsPositive()
  sizeBytes?: number;
}
