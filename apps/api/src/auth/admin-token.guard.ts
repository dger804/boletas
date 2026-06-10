import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { timingSafeEqual } from "node:crypto";
import { AuthService } from "./auth.service";

type HeaderValue = string | string[] | undefined;

@Injectable()
export class AdminTokenGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly auth?: AuthService
  ) {}

  async canActivate(context: ExecutionContext) {
    const expectedToken = this.config.get<string>("ADMIN_API_TOKEN")?.trim();
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, HeaderValue>;
    }>();

    if (await this.hasAdminSession(request.headers)) {
      return true;
    }

    if (!expectedToken) {
      if (this.allowsUnsafeLocalBypass()) {
        return true;
      }

      throw new ServiceUnavailableException("admin token is not configured");
    }

    const providedToken = this.extractToken(request.headers);

    if (!providedToken || !this.tokensMatch(providedToken, expectedToken)) {
      throw new UnauthorizedException("invalid admin token");
    }

    return true;
  }

  private extractToken(headers: Record<string, HeaderValue>) {
    const adminToken = this.firstHeader(headers["x-admin-token"]);
    if (adminToken) {
      return adminToken.trim();
    }

    const authorization = this.firstHeader(headers.authorization);
    if (authorization?.startsWith("Bearer ")) {
      return authorization.slice("Bearer ".length).trim();
    }

    return undefined;
  }

  private allowsUnsafeLocalBypass() {
    return (
      this.config.get<string>("NODE_ENV") !== "production" &&
      !this.config.get<string>("DATABASE_URL") &&
      !this.config.get<string>("AUTH_TOKEN_SECRET") &&
      !this.config.get<string>("CORS_ORIGIN")
    );
  }

  private firstHeader(value: HeaderValue) {
    return Array.isArray(value) ? value[0] : value;
  }

  private async hasAdminSession(headers: Record<string, HeaderValue>) {
    const authorization = this.firstHeader(headers.authorization);

    if (!authorization?.startsWith("Bearer ") || !this.auth) {
      return false;
    }

    try {
      return (
        (await this.auth.verifyActiveToken(authorization.slice("Bearer ".length)))
          .role ===
        "admin"
      );
    } catch {
      return false;
    }
  }

  private tokensMatch(providedToken: string, expectedToken: string) {
    const provided = Buffer.from(providedToken);
    const expected = Buffer.from(expectedToken);

    return (
      provided.length === expected.length && timingSafeEqual(provided, expected)
    );
  }
}
