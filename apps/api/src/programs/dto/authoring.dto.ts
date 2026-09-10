import { IsInt, IsOptional, IsString, Matches, Max, Min, MinLength } from "class-validator";

export class CreateProgramDto {
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: "slug must be lowercase alphanumeric with hyphens" })
  slug!: string;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsString()
  @MinLength(1)
  summary!: string;

  @IsOptional()
  @IsString()
  careerId?: string;
}

export class RequestDraftDto {
  @IsOptional()
  @IsInt()
  @Min(3)
  @Max(14)
  durationDays?: number;
}
