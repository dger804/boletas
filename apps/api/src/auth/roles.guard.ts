import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import type { AuthenticatedUser, UserRole } from "@boletas/shared";
import { timingSafeEqual } from "node:crypto";
import { AuthService } from "./auth.service";
import type { RequestWithUser } from "./auth-token.guard";
import { ROLES_KEY } from "./roles.decorator";

type HeaderValue = string | string[] | undefined;

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
    private readonly config: ConfigService
  ) {}

  async canActivate(context: ExecutionContext) {
    const allowedRoles =
      this.reflector.getAllAndOverride<readonly UserRole[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass()
      ]) ?? [];

    if (allowedRoles.length === 0) {
      throw new ForbiddenException("allowed roles are not configured");
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const adminTokenUser = this.getAdminTokenUser(request.headers);

    if (adminTokenUser) {
      request.user = adminTokenUser;
      return this.hasRole(adminTokenUser.role, allowedRoles);
    }

    const sessionToken = this.extractBearerToken(request.headers);

    if (!sessionToken) {
      throw new UnauthorizedException("missing auth token");
    }

    const user = await this.auth.verifyActiveToken(sessionToken);
    request.user = user;

    return this.hasRole(user.role, allowedRoles);
  }

  private hasRole(role: UserRole, allowedRoles: readonly UserRole[]) {
    if (!allowedRoles.includes(role)) {
      throw new ForbiddenException("insufficient role");
    }

    return true;
  }

  private getAdminTokenUser(headers: Record<string, HeaderValue>) {
    const expectedToken = this.config.get<string>("ADMIN_API_TOKEN")?.trim();

    if (!expectedToken) {
      return undefined;
    }

    const providedToken = this.extractAdminToken(headers);

    if (!providedToken || !this.tokensMatch(providedToken, expectedToken)) {
      return undefined;
    }

    return {
      email: "admin-token@boletas.local",
      id: "admin-token",
      name: "Admin Token",
      role: "admin"
    } satisfies AuthenticatedUser;
  }

  private extractAdminToken(headers: Record<string, HeaderValue>) {
    const adminToken = this.firstHeader(headers["x-admin-token"]);

    if (adminToken) {
      return adminToken.trim();
    }

    return this.extractBearerToken(headers);
  }

  private extractBearerToken(headers: Record<string, HeaderValue>) {
    const authorization = this.firstHeader(headers.authorization);

    if (authorization?.startsWith("Bearer ")) {
      return authorization.slice("Bearer ".length).trim();
    }

    return undefined;
  }

  private firstHeader(value: HeaderValue) {
    return Array.isArray(value) ? value[0] : value;
  }

  private tokensMatch(providedToken: string, expectedToken: string) {
    const provided = Buffer.from(providedToken);
    const expected = Buffer.from(expectedToken);

    return (
      provided.length === expected.length && timingSafeEqual(provided, expected)
    );
  }
}
