import { IsString, MinLength } from "class-validator";

export class EnrollDto {
  @IsString()
  @MinLength(1)
  programSlug!: string;
}
