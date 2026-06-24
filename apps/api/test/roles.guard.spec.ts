import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { AuthenticatedUser, UserRole } from "@boletas/shared";
import { AuthService } from "../src/auth/auth.service";
import { RolesGuard } from "../src/auth/roles.guard";

const createReflector = (roles: UserRole[]) =>
  ({
    getAllAndOverride: jest.fn().mockReturnValue(roles)
  }) as unknown as Reflector;

const createAuth = (user: AuthenticatedUser) =>
  ({
    verifyActiveToken: jest.fn().mockResolvedValue(user)
  }) as unknown as AuthService;

const createContext = (headers: Record<string, string | string[] | undefined>) =>
  ({
    getClass: () => class TestController {},
    getHandler: () => function testHandler() {},
    switchToHttp: () => ({
      getRequest: () => ({ headers })
    })
  }) as unknown as ExecutionContext;

const userWithRole = (role: UserRole): AuthenticatedUser => ({
  email: `${role}@example.com`,
  id: `usr_${role}`,
  name: role,
  role
});

describe("RolesGuard", () => {
  it("accepts a session whose role is explicitly allowed", async () => {
    const guard = new RolesGuard(
      createReflector(["regular", "supervisor", "admin"]),
      createAuth(userWithRole("regular"))
    );

    await expect(
      guard.canActivate(createContext({ authorization: "Bearer session-token" }))
    ).resolves.toBe(true);
  });

  it("rejects missing bearer tokens", async () => {
    const guard = new RolesGuard(
      createReflector(["regular"]),
      createAuth(userWithRole("regular"))
    );

    await expect(guard.canActivate(createContext({}))).rejects.toThrow(
      UnauthorizedException
    );
  });

  it("rejects sessions without a sufficient role", async () => {
    const guard = new RolesGuard(
      createReflector(["supervisor", "admin"]),
      createAuth(userWithRole("regular"))
    );

    await expect(
      guard.canActivate(createContext({ authorization: "Bearer session-token" }))
    ).rejects.toThrow(ForbiddenException);
  });

  it("rejects legacy admin token headers", async () => {
    const guard = new RolesGuard(
      createReflector(["admin"]),
      createAuth(userWithRole("regular"))
    );

    await expect(
      guard.canActivate(createContext({ "x-admin-token": "correct-token" }))
    ).rejects.toThrow(UnauthorizedException);
  });

  it("fails closed when a controller forgets to declare roles", async () => {
    const guard = new RolesGuard(
      createReflector([]),
      createAuth(userWithRole("admin"))
    );

    await expect(
      guard.canActivate(createContext({ authorization: "Bearer session-token" }))
    ).rejects.toThrow(ForbiddenException);
  });
});
