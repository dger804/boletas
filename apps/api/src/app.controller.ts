import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "./database/prisma.service";

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("health")
  health() {
    return {
      app: "boletas-api",
      status: "ok",
      time: new Date().toISOString()
    };
  }

  @Get("health/db")
  async databaseHealth() {
    const database = await this.prisma.checkConnection();

    return {
      app: "boletas-api",
      ...database,
      time: new Date().toISOString()
    };
  }
}
