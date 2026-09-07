import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested
} from "class-validator";

export class GuidanceStepLinkDto {
  @IsIn(["program"])
  kind!: "program";

  @IsString()
  @MinLength(1)
  slug!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  label!: string;
}

export class GuidanceStepDto {
  @IsString()
  id!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  detail?: string;

  @IsIn(["todo", "in_progress", "done"])
  status!: "todo" | "in_progress" | "done";

  @IsInt()
  order!: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => GuidanceStepLinkDto)
  link?: GuidanceStepLinkDto | null;
}

export class GuidancePlanDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  summary?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GuidanceStepDto)
  @ArrayMaxSize(50)
  steps!: GuidanceStepDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  linkedCareerIds?: string[];

  @IsOptional()
  @IsIn(["draft", "active", "completed"])
  status?: "draft" | "active" | "completed";
}
