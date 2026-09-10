import { IsArray, IsOptional, IsString } from "class-validator";

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  gradeLevel?: string;

  @IsOptional()
  @IsString()
  ageBand?: string;

  @IsArray()
  @IsString({ each: true })
  favoriteSubjects!: string[];

  @IsArray()
  @IsString({ each: true })
  favoriteActivities!: string[];

  @IsArray()
  @IsString({ each: true })
  topicsCuriousAbout!: string[];

  @IsArray()
  @IsString({ each: true })
  personalStrengths!: string[];

  @IsArray()
  @IsString({ each: true })
  avoidsOrDislikes!: string[];
}
