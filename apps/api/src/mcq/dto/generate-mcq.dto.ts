import { IsInt, IsOptional, IsString, Max, Min, MinLength } from "class-validator";

export class GenerateMcqDto {
  @IsString()
  @MinLength(1)
  subject!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  count?: number;
}
