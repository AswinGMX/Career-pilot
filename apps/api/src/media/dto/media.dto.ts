import { IsIn, IsObject, IsOptional, IsString, MinLength } from "class-validator";

export class InitMediaDto {
  @IsIn(["video", "audio", "panorama360", "image"])
  kind!: "video" | "audio" | "panorama360" | "image";

  @IsString()
  @MinLength(1)
  mimeType!: string;

  @IsOptional()
  @IsObject()
  license?: Record<string, unknown>;
}

export class AttachMediaDto {
  @IsString()
  @MinLength(1)
  contentBlockId!: string;
}
