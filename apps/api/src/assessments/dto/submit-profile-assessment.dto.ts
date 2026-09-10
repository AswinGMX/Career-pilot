import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsString, ValidateNested, IsInt, Min, Max } from "class-validator";

class ProofQuestionDto {
  @IsString()
  id!: string;

  @IsString()
  dimension!: string;

  @IsString()
  question!: string;

  @IsString()
  whyItMatters!: string;

  @IsArray()
  @IsString({ each: true })
  options!: string[];
}

class ProofAnswerDto {
  @IsString()
  questionId!: string;

  @IsInt()
  @Min(0)
  @Max(3)
  optionIndex!: number;
}

export class SubmitProfileAssessmentDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ProofQuestionDto)
  questions!: ProofQuestionDto[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ProofAnswerDto)
  answers!: ProofAnswerDto[];
}
