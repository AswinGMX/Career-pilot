import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsInt, IsString, Max, Min, ValidateNested } from "class-validator";

class ProofAnswerDto {
  @IsString()
  questionId!: string;

  @IsInt()
  @Min(0)
  @Max(3)
  optionIndex!: number;
}

export class SubmitProofSessionDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ProofAnswerDto)
  answers!: ProofAnswerDto[];
}
