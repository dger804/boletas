import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import type { AuthenticatedUser } from "@boletas/shared";
import { AuthService } from "./auth.service";

type HeaderValue = string | string[] | undefined;

export interface RequestWithUser {
  headers: Record<string, HeaderValue>;
  user?: AuthenticatedUser;
}

@Injectable()
export class AuthTokenGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = this.extractBearerToken(request.headers);

    if (!token) {
      throw new UnauthorizedException("missing auth token");
    }

    request.user = await this.auth.verifyActiveToken(token);

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
