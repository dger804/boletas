import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { AppUser } from "@prisma/client";
import type { AuthenticatedUser, LoginResponse } from "@boletas/shared";
import { createHmac, timingSafeEqual } from "node:crypto";
import { PrismaService } from "../database/prisma.service";
import { verifyPassword } from "./passwords";

interface TokenPayload extends AuthenticatedUser {
  exp: number;
  iat: number;
}

const DEFAULT_TOKEN_TTL_SECONDS = 60 * 60 * 8;
const USER_ROLES = [
  "regular",
  "supervisor",
  "admin"
] as const satisfies readonly AuthenticatedUser["role"][];

@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService
  ) {}

  async login(email: string, password: string): Promise<LoginResponse> {
    if (!this.prisma.isConfigured()) {
      throw new ServiceUnavailableException("database is not configured");
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.appUser.findUnique({
      where: { email: normalizedEmail }
    });

    if (
      !user ||
      user.status !== "active" ||
      !verifyPassword(password, user.passwordHash)
    ) {
      throw new UnauthorizedException("invalid credentials");
    }

    await this.prisma.appUser.update({
      data: { lastLoginAt: new Date() },
      where: { id: user.id }
    });

    return this.createLoginResponse(user);
  }

  verifyToken(token: string): AuthenticatedUser {
    const parts = token.split(".");

    if (parts.length !== 3) {
      throw new UnauthorizedException("invalid auth token");
    }

    const [encodedHeader, encodedPayload, providedSignature] = parts;

    if (!encodedHeader || !encodedPayload || !providedSignature) {
      throw new UnauthorizedException("invalid auth token");
    }

    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const expectedSignature = this.sign(signingInput);

    if (!this.signaturesMatch(providedSignature, expectedSignature)) {
      throw new UnauthorizedException("invalid auth token");
    }

    const payload = this.parsePayload(encodedPayload);
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp <= now) {
      throw new UnauthorizedException("expired auth token");
    }

    return {
      email: payload.email,
      id: payload.id,
      name: payload.name,
      role: payload.role
    };
  }

  async verifyActiveToken(token: string): Promise<AuthenticatedUser> {
    const tokenUser = this.verifyToken(token);

    if (!this.prisma.isConfigured()) {
      throw new ServiceUnavailableException("database is not configured");
    }

    const user = await this.prisma.appUser.findUnique({
      where: { id: tokenUser.id }
    });

    if (!user || user.status !== "active") {
      throw new UnauthorizedException("invalid auth token");
    }

    return this.toSessionUser(user);
  }

  private createLoginResponse(user: AppUser): LoginResponse {
    const issuedAt = Math.floor(Date.now() / 1000);
    const expiresAt = issuedAt + this.getTokenTtlSeconds();
    const sessionUser = this.toSessionUser(user);
    const payload: TokenPayload = {
      ...sessionUser,
      exp: expiresAt,
      iat: issuedAt
    };
    const header = { alg: "HS256", typ: "JWT" };
    const encodedHeader = this.encodeJson(header);
    const encodedPayload = this.encodeJson(payload);
    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const signature = this.sign(signingInput);

    return {
      expiresAt: new Date(expiresAt * 1000).toISOString(),
      token: `${signingInput}.${signature}`,
      tokenType: "Bearer",
      user: sessionUser
    };
  }

  private toSessionUser(user: AppUser): AuthenticatedUser {
    return {
      email: user.email,
      id: user.id,
      name: user.name,
      role: user.role as AuthenticatedUser["role"]
    };
  }

  private encodeJson(value: unknown) {
    return Buffer.from(JSON.stringify(value)).toString("base64url");
  }

  private parsePayload(encodedPayload: string): TokenPayload {
    try {
      const parsed = JSON.parse(
        Buffer.from(encodedPayload, "base64url").toString("utf8")
      ) as Partial<TokenPayload>;

      if (
        !parsed.id ||
        !parsed.email ||
        !parsed.name ||
        !parsed.role ||
        !USER_ROLES.includes(parsed.role) ||
        typeof parsed.exp !== "number" ||
        typeof parsed.iat !== "number"
      ) {
        throw new Error("invalid payload");
      }

      return parsed as TokenPayload;
    } catch {
      throw new UnauthorizedException("invalid auth token");
    }
  }

  private sign(signingInput: string) {
    return createHmac("sha256", this.getTokenSecret())
      .update(signingInput)
      .digest("base64url");
  }

  private signaturesMatch(providedSignature: string, expectedSignature: string) {
    const provided = Buffer.from(providedSignature);
    const expected = Buffer.from(expectedSignature);

    return (
      provided.length === expected.length && timingSafeEqual(provided, expected)
    );
  }

  private getTokenSecret() {
    const configuredSecret = this.config.get<string>("AUTH_TOKEN_SECRET")?.trim();

    if (configuredSecret) {
      return configuredSecret;
    }

    if (this.config.get<string>("NODE_ENV") !== "production") {
      return "dev-only-auth-token-secret";
    }

    throw new ServiceUnavailableException("auth token secret is not configured");
  }

  private getTokenTtlSeconds() {
    const configuredTtl = Number(
      this.config.get<string>("AUTH_TOKEN_TTL_SECONDS")
    );

    return Number.isInteger(configuredTtl) && configuredTtl >= 300
      ? configuredTtl
      : DEFAULT_TOKEN_TTL_SECONDS;
  }
}
