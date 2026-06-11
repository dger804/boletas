import { SetMetadata } from "@nestjs/common";
import type { UserRole } from "@boletas/shared";

export const ROLES_KEY = "boletas:roles";

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
