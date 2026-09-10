import { IsInt, IsPositive, IsString, MinLength } from "class-validator";

export class AvatarUploadInitDto {
  @IsString()
  @MinLength(1)
  mimeType!: string;

  /**
   * Declared size, checked against the ceiling before a signed URL is issued.
   * It is a client claim, so the byte count is re-checked after upload.
   */
  @IsInt()
  @IsPositive()
  sizeBytes!: number;
}
