import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AuthTokenGuard } from "./auth-token.guard";

@Module({
  imports: [DatabaseModule],
  controllers: [AuthController],
  providers: [AuthService, AuthTokenGuard],
  exports: [AuthService, AuthTokenGuard]
})
export class AuthModule {}
