import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { AppUser } from "@prisma/client";
import { AuthService } from "../src/auth/auth.service";
import { createPasswordHash, verifyPassword } from "../src/auth/passwords";
import { PrismaService } from "../src/database/prisma.service";

const createConfig = (values: Record<string, string | undefined>) =>
  ({
    get: (key: string) => values[key]
  }) as ConfigService;

const createUser = (password: string): AppUser => ({
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  email: "admin@example.com",
  id: "usr_admin",
  lastLoginAt: null,
  name: "Admin",
  passwordHash: createPasswordHash(password),
  role: "admin",
  status: "active",
  updatedAt: new Date("2026-01-01T00:00:00.000Z")
});

const createPrisma = (user: AppUser | null) =>
  ({
    appUser: {
      findUnique: jest.fn().mockResolvedValue(user),
      update: jest.fn().mockResolvedValue(user)
    },
    isConfigured: () => true
  }) as unknown as PrismaService;

describe("AuthService", () => {
  it("hashes and verifies passwords", () => {
    const hash = createPasswordHash("PruebaSegura2026");

    expect(hash).toMatch(/^scrypt\$/);
    expect(verifyPassword("PruebaSegura2026", hash)).toBe(true);
    expect(verifyPassword("otra-clave", hash)).toBe(false);
  });

  it("logs in an active user and verifies the issued token", async () => {
    const user = createUser("PruebaSegura2026");
    const service = new AuthService(
      createConfig({
        AUTH_TOKEN_SECRET: "test-secret",
        NODE_ENV: "production"
      }),
      createPrisma(user)
    );

    const response = await service.login(" ADMIN@example.com ", "PruebaSegura2026");
    const sessionUser = service.verifyToken(response.token);

    expect(response.tokenType).toBe("Bearer");
    expect(response.user).toMatchObject({
      email: "admin@example.com",
      role: "admin"
    });
    expect(sessionUser).toMatchObject({
      id: "usr_admin",
      role: "admin"
    });
  });

  it("returns fresh user data when validating an active token", async () => {
    const user = createUser("PruebaSegura2026");
    const updatedUser = { ...user, role: "supervisor" as const };
    const prisma = {
      appUser: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce(user)
          .mockResolvedValueOnce(updatedUser),
        update: jest.fn().mockResolvedValue(user)
      },
      isConfigured: () => true
    } as unknown as PrismaService;
    const service = new AuthService(
      createConfig({
        AUTH_TOKEN_SECRET: "test-secret",
        NODE_ENV: "production"
      }),
      prisma
    );

    const response = await service.login("admin@example.com", "PruebaSegura2026");
    const sessionUser = await service.verifyActiveToken(response.token);

    expect(sessionUser).toMatchObject({
      id: "usr_admin",
      role: "supervisor"
    });
  });

  it("rejects invalid credentials", async () => {
    const user = createUser("PruebaSegura2026");
    const service = new AuthService(
      createConfig({
        AUTH_TOKEN_SECRET: "test-secret",
        NODE_ENV: "production"
      }),
      createPrisma(user)
    );

    await expect(
      service.login("admin@example.com", "clave-incorrecta")
    ).rejects.toThrow(UnauthorizedException);
  });
});
