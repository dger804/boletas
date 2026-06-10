import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards
} from "@nestjs/common";
import { AdminTokenGuard } from "./admin-token.guard";
import { CreateUserDto, UpdateUserDto } from "./dto";
import { UsersService } from "./users.service";

@Controller("auth/users")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @UseGuards(AdminTokenGuard)
  @Get()
  async listUsers() {
    return { users: await this.users.listUsers() };
  }

  @UseGuards(AdminTokenGuard)
  @Post()
  createUser(@Body() dto: CreateUserDto) {
    return this.users.createUser(dto);
  }

  @UseGuards(AdminTokenGuard)
  @Patch(":id")
  updateUser(@Param("id") id: string, @Body() dto: UpdateUserDto) {
    return this.users.updateUser(id, dto);
  }
}
