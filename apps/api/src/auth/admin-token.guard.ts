import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { timingSafeEqual } from "node:crypto";

type HeaderValue = string | string[] | undefined;

@Injectable()
export class AdminTokenGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext) {
    const expectedToken = this.config.get<string>("ADMIN_API_TOKEN")?.trim();

    if (!expectedToken) {
      if (this.config.get<string>("NODE_ENV") !== "production") {
        return true;
      }

      throw new ServiceUnavailableException("admin token is not configured");
    }

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, HeaderValue>;
    }>();
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
