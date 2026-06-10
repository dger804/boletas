import { BadRequestException } from "@nestjs/common";
import type { AppUser } from "@prisma/client";
import { UsersService } from "../src/auth/users.service";
import { PrismaService } from "../src/database/prisma.service";

const baseDate = new Date("2026-01-01T00:00:00.000Z");

const createUser = (overrides: Partial<AppUser> = {}): AppUser => ({
  createdAt: baseDate,
  email: "admin@example.com",
  id: "usr_admin",
  lastLoginAt: null,
  name: "Admin",
  passwordHash: "hashed-password",
  role: "admin",
  status: "active",
  updatedAt: baseDate,
  ...overrides
});

const createPrisma = (appUser: Partial<PrismaService["appUser"]>) =>
  ({
    appUser,
    isConfigured: () => true
  }) as unknown as PrismaService;

describe("UsersService", () => {
  it("creates users with normalized email and sanitized response", async () => {
    const createdUser = createUser({
      email: "regular@example.com",
      id: "usr_regular",
      name: "Usuario Regular",
      role: "regular"
    });
    const prisma = createPrisma({
      create: jest.fn().mockResolvedValue(createdUser)
    });
    const service = new UsersService(prisma);

    const response = await service.createUser({
      email: " REGULAR@example.com ",
      name: " Usuario Regular ",
      password: "PruebaSegura2026",
      role: "regular"
    });

    expect(prisma.appUser.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "regular@example.com",
        name: "Usuario Regular",
        role: "regular",
        status: "active"
      })
    });
    expect(response).toEqual({
      createdAt: "2026-01-01T00:00:00.000Z",
      email: "regular@example.com",
      id: "usr_regular",
      lastLoginAt: undefined,
      name: "Usuario Regular",
      role: "regular",
      status: "active",
      updatedAt: "2026-01-01T00:00:00.000Z"
    });
    expect(response).not.toHaveProperty("passwordHash");
  });

  it("updates role and status when another active admin remains", async () => {
    const existingUser = createUser();
    const updatedUser = createUser({ role: "supervisor", status: "disabled" });
    const prisma = createPrisma({
      count: jest.fn().mockResolvedValue(1),
      findUnique: jest.fn().mockResolvedValue(existingUser),
      update: jest.fn().mockResolvedValue(updatedUser)
    });
    const service = new UsersService(prisma);

    const response = await service.updateUser("usr_admin", {
      role: "supervisor",
      status: "disabled"
    });

    expect(prisma.appUser.count).toHaveBeenCalledWith({
      where: {
        id: { not: "usr_admin" },
        role: "admin",
        status: "active"
      }
    });
    expect(prisma.appUser.update).toHaveBeenCalledWith({
      data: {
        role: "supervisor",
        status: "disabled"
      },
      where: { id: "usr_admin" }
    });
    expect(response.role).toBe("supervisor");
    expect(response.status).toBe("disabled");
  });

  it("prevents demoting the last active admin", async () => {
    const prisma = createPrisma({
      count: jest.fn().mockResolvedValue(0),
      findUnique: jest.fn().mockResolvedValue(createUser())
    });
    const service = new UsersService(prisma);

    await expect(
      service.updateUser("usr_admin", { role: "regular" })
    ).rejects.toThrow(BadRequestException);
  });
});
