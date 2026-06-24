import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AuthTokenGuard } from "./auth-token.guard";
import { RolesGuard } from "./roles.guard";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

@Module({
  imports: [DatabaseModule],
  controllers: [AuthController, UsersController],
  providers: [AuthService, AuthTokenGuard, RolesGuard, UsersService],
  exports: [AuthService, AuthTokenGuard, RolesGuard]
})
export class AuthModule {}
