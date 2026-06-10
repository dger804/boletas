import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthTokenGuard, type RequestWithUser } from "./auth-token.guard";
import { LoginDto } from "./dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @UseGuards(AuthTokenGuard)
  @Get("me")
  me(@Req() request: RequestWithUser) {
    return { user: request.user };
  }
}
