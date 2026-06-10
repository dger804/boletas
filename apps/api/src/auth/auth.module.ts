import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { AdminTokenGuard } from "./admin-token.guard";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AuthTokenGuard } from "./auth-token.guard";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

@Module({
  imports: [DatabaseModule],
  controllers: [AuthController, UsersController],
  providers: [AdminTokenGuard, AuthService, AuthTokenGuard, UsersService],
  exports: [AuthService, AuthTokenGuard]
})
export class AuthModule {}
