import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { UserRole } from "@boletas/shared";
import { AuthService } from "./auth.service";
import type { RequestWithUser } from "./auth-token.guard";
import { ROLES_KEY } from "./roles.decorator";

type HeaderValue = string | string[] | undefined;

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService
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
}
