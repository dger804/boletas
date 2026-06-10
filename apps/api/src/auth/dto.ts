import type { UserRole, UserStatus } from "@boletas/shared";
import { IsEmail, IsIn, IsOptional, IsString, MinLength } from "class-validator";

const USER_ROLES = [
  "regular",
  "supervisor",
  "admin"
] as const satisfies readonly UserRole[];
const USER_STATUSES = [
  "active",
  "disabled"
] as const satisfies readonly UserStatus[];

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsIn(USER_ROLES)
  role!: (typeof USER_ROLES)[number];

  @IsIn(USER_STATUSES)
  @IsOptional()
  status?: (typeof USER_STATUSES)[number];
}

export class UpdateUserDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @MinLength(2)
  @IsOptional()
  name?: string;

  @IsString()
  @MinLength(8)
  @IsOptional()
  password?: string;

  @IsIn(USER_ROLES)
  @IsOptional()
  role?: (typeof USER_ROLES)[number];

  @IsIn(USER_STATUSES)
  @IsOptional()
  status?: (typeof USER_STATUSES)[number];
}
