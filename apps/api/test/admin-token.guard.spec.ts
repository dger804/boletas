import {
  ExecutionContext,
  ServiceUnavailableException,
  UnauthorizedException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AdminTokenGuard } from "../src/auth/admin-token.guard";
import { AuthService } from "../src/auth/auth.service";

const createConfig = (values: Record<string, string | undefined>) =>
  ({
    get: (key: string) => values[key]
  }) as ConfigService;

const createContext = (headers: Record<string, string | string[] | undefined>) =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ headers })
    })
  }) as ExecutionContext;

describe("AdminTokenGuard", () => {
  it("allows local development without a configured token", async () => {
    const guard = new AdminTokenGuard(
      createConfig({ NODE_ENV: "development" })
    );

    await expect(guard.canActivate(createContext({}))).resolves.toBe(true);
  });

  it("rejects missing credentials when production-like config exists", async () => {
    const guard = new AdminTokenGuard(
      createConfig({
        AUTH_TOKEN_SECRET: "auth-secret",
        DATABASE_URL: "mysql://user:pass@example.com:3306/db"
      })
    );

    await expect(guard.canActivate(createContext({}))).rejects.toThrow(
      UnauthorizedException
    );
  });

  it("rejects missing credentials in production", async () => {
    const guard = new AdminTokenGuard(createConfig({ NODE_ENV: "production" }));

    await expect(guard.canActivate(createContext({}))).rejects.toThrow(
      UnauthorizedException
    );
  });

  it("fails closed when the legacy admin token is used but not configured", async () => {
    const guard = new AdminTokenGuard(createConfig({ NODE_ENV: "production" }));

    await expect(
      guard.canActivate(createContext({ "x-admin-token": "provided-token" }))
    ).rejects.toThrow(
      ServiceUnavailableException
    );
  });

  it("rejects invalid tokens", async () => {
    const guard = new AdminTokenGuard(
      createConfig({
        ADMIN_API_TOKEN: "correct-token",
        NODE_ENV: "production"
      })
    );

    await expect(
      guard.canActivate(createContext({ "x-admin-token": "wrong-token" }))
    ).rejects.toThrow(UnauthorizedException);
  });

  it("accepts the x-admin-token header", async () => {
    const guard = new AdminTokenGuard(
      createConfig({
        ADMIN_API_TOKEN: "correct-token",
        NODE_ENV: "production"
      })
    );

    await expect(
      guard.canActivate(createContext({ "x-admin-token": "correct-token" }))
    ).resolves.toBe(true);
  });

  it("accepts bearer tokens", async () => {
    const guard = new AdminTokenGuard(
      createConfig({
        ADMIN_API_TOKEN: "correct-token",
        NODE_ENV: "production"
      })
    );

    await expect(
      guard.canActivate(
        createContext({ authorization: "Bearer correct-token" })
      )
    ).resolves.toBe(true);
  });

  it("accepts admin session bearer tokens", async () => {
    const auth = {
      verifyActiveToken: jest.fn().mockResolvedValue({
        email: "admin@example.com",
        id: "usr_admin",
        name: "Admin",
        role: "admin"
      })
    } as unknown as AuthService;
    const guard = new AdminTokenGuard(
      createConfig({ NODE_ENV: "production" }),
      auth
    );

    await expect(
      guard.canActivate(createContext({ authorization: "Bearer session-token" }))
    ).resolves.toBe(true);
  });

  it("rejects non-admin session bearer tokens when no admin token matches", async () => {
    const auth = {
      verifyActiveToken: jest.fn().mockResolvedValue({
        email: "supervisor@example.com",
        id: "usr_supervisor",
        name: "Supervisor",
        role: "supervisor"
      })
    } as unknown as AuthService;
    const guard = new AdminTokenGuard(
      createConfig({
        ADMIN_API_TOKEN: "correct-token",
        NODE_ENV: "production"
      }),
      auth
    );

    await expect(
      guard.canActivate(createContext({ authorization: "Bearer session-token" }))
    ).rejects.toThrow(UnauthorizedException);
  });
});
