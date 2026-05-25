import { Controller, Get } from "@nestjs/common";

@Controller()
export class AppController {
  @Get("health")
  health() {
    return {
      app: "boletas-api",
      status: "ok",
      time: new Date().toISOString()
    };
  }
}
