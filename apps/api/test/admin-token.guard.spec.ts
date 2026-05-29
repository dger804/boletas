import {
  ExecutionContext,
  ServiceUnavailableException,
  UnauthorizedException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AdminTokenGuard } from "../src/auth/admin-token.guard";

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
  it("allows local development without a configured token", () => {
    const guard = new AdminTokenGuard(
      createConfig({ NODE_ENV: "development" })
    );

    expect(guard.canActivate(createContext({}))).toBe(true);
  });

  it("fails closed in production when token is missing", () => {
    const guard = new AdminTokenGuard(createConfig({ NODE_ENV: "production" }));

    expect(() => guard.canActivate(createContext({}))).toThrow(
      ServiceUnavailableException
    );
  });

  it("rejects invalid tokens", () => {
    const guard = new AdminTokenGuard(
      createConfig({
        ADMIN_API_TOKEN: "correct-token",
        NODE_ENV: "production"
      })
    );

    expect(() =>
      guard.canActivate(createContext({ "x-admin-token": "wrong-token" }))
    ).toThrow(UnauthorizedException);
  });

  it("accepts the x-admin-token header", () => {
    const guard = new AdminTokenGuard(
      createConfig({
        ADMIN_API_TOKEN: "correct-token",
        NODE_ENV: "production"
      })
    );

    expect(
      guard.canActivate(createContext({ "x-admin-token": "correct-token" }))
    ).toBe(true);
  });

  it("accepts bearer tokens", () => {
    const guard = new AdminTokenGuard(
      createConfig({
        ADMIN_API_TOKEN: "correct-token",
        NODE_ENV: "production"
      })
    );

    expect(
      guard.canActivate(
        createContext({ authorization: "Bearer correct-token" })
      )
    ).toBe(true);
  });
});
