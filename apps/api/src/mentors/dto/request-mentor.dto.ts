import { IsOptional, IsString, MaxLength } from "class-validator";

export class RequestMentorDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;
}
