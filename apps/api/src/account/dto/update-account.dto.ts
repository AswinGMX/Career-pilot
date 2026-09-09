import { IsOptional, IsString, MaxLength, MinLength, ValidateIf } from "class-validator";

/**
 * Partial update of the non-credential account fields.
 *
 * Omitting a key leaves it unchanged; sending `null` clears it. `@ValidateIf`
 * is what makes that distinction expressible — without it, `null` fails the
 * string check and the user can never remove a phone number they once set.
 */
export class UpdateAccountDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  lastName?: string;

  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsString()
  @MaxLength(32)
  phone?: string | null;

  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsString()
  @MaxLength(64)
  timezone?: string | null;

  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsString()
  @MaxLength(32)
  locale?: string | null;
}
