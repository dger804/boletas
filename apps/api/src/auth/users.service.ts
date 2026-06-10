import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException
} from "@nestjs/common";
import { Prisma, type AppUser } from "@prisma/client";
import type { ManagedUser } from "@boletas/shared";
import { PrismaService } from "../database/prisma.service";
import { CreateUserDto, UpdateUserDto } from "./dto";
import { createPasswordHash } from "./passwords";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers(): Promise<ManagedUser[]> {
    this.ensureDatabase();

    const users = await this.prisma.appUser.findMany({
      orderBy: [{ createdAt: "desc" }]
    });

    return users.map((user) => this.toManagedUser(user));
  }

  async createUser(dto: CreateUserDto): Promise<ManagedUser> {
    this.ensureDatabase();

    try {
      const user = await this.prisma.appUser.create({
        data: {
          email: this.normalizeEmail(dto.email),
          name: this.normalizeName(dto.name),
          passwordHash: createPasswordHash(dto.password),
          role: dto.role,
          status: dto.status ?? "active"
        }
      });

      return this.toManagedUser(user);
    } catch (error) {
      this.handlePrismaWriteError(error);
    }
  }

  async updateUser(id: string, dto: UpdateUserDto): Promise<ManagedUser> {
    this.ensureDatabase();

    const existing = await this.prisma.appUser.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException("user was not found");
    }

    await this.ensureLastActiveAdminRemains(existing, dto);

    const data: Prisma.AppUserUpdateInput = {};

    if (dto.email !== undefined) {
      data.email = this.normalizeEmail(dto.email);
    }

    if (dto.name !== undefined) {
      data.name = this.normalizeName(dto.name);
    }

    if (dto.password !== undefined) {
      data.passwordHash = createPasswordHash(dto.password);
    }

    if (dto.role !== undefined) {
      data.role = dto.role;
    }

    if (dto.status !== undefined) {
      data.status = dto.status;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException("no user fields were provided");
    }

    try {
      const user = await this.prisma.appUser.update({
        data,
        where: { id }
      });

      return this.toManagedUser(user);
    } catch (error) {
      this.handlePrismaWriteError(error);
    }
  }

  private async ensureLastActiveAdminRemains(
    existing: AppUser,
    dto: UpdateUserDto
  ) {
    const nextRole = dto.role ?? existing.role;
    const nextStatus = dto.status ?? existing.status;
    const removesActiveAdmin =
      existing.role === "admin" &&
      existing.status === "active" &&
      (nextRole !== "admin" || nextStatus !== "active");

    if (!removesActiveAdmin) {
      return;
    }

    const remainingActiveAdmins = await this.prisma.appUser.count({
      where: {
        id: { not: existing.id },
        role: "admin",
        status: "active"
      }
    });

    if (remainingActiveAdmins === 0) {
      throw new BadRequestException("at least one active admin is required");
    }
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private normalizeName(name: string) {
    const normalizedName = name.trim();

    if (!normalizedName) {
      throw new BadRequestException("name is required");
    }

    return normalizedName;
  }

  private toManagedUser(user: AppUser): ManagedUser {
    return {
      createdAt: user.createdAt.toISOString(),
      email: user.email,
      id: user.id,
      lastLoginAt: user.lastLoginAt?.toISOString(),
      name: user.name,
      role: user.role,
      status: user.status,
      updatedAt: user.updatedAt.toISOString()
    };
  }

  private ensureDatabase() {
    if (!this.prisma.isConfigured()) {
      throw new ServiceUnavailableException("database is not configured");
    }
  }

  private handlePrismaWriteError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new ConflictException("email is already registered");
      }

      if (error.code === "P2025") {
        throw new NotFoundException("user was not found");
      }
    }

    throw error;
  }
}
