import { IsString, MinLength } from "class-validator";

export class StartProofSessionDto {
  @IsString()
  @MinLength(1)
  careerSlug!: string;
}
