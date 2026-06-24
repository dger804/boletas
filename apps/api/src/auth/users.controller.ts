import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards
} from "@nestjs/common";
import type { RequestWithUser } from "./auth-token.guard";
import { CreateUserDto, UpdateUserDto } from "./dto";
import { Roles } from "./roles.decorator";
import { RolesGuard } from "./roles.guard";
import { UsersService } from "./users.service";

@Controller("auth/users")
@UseGuards(RolesGuard)
@Roles("admin")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  async listUsers() {
    return { users: await this.users.listUsers() };
  }

  @Post()
  createUser(@Body() dto: CreateUserDto) {
    return this.users.createUser(dto);
  }

  @Patch(":id")
  updateUser(@Param("id") id: string, @Body() dto: UpdateUserDto) {
    return this.users.updateUser(id, dto);
  }

  @Delete(":id")
  deleteUser(@Param("id") id: string, @Req() request: RequestWithUser) {
    if (request.user?.role !== "admin") {
      throw new ForbiddenException("admin role is required");
    }

    return this.users.deleteUser(id, request.user.id);
  }
}
