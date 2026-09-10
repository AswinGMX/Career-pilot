import { IsEmail, IsString, MinLength } from "class-validator";

export class CreateSchoolStudentDto {
  @IsString()
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
