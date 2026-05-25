import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ServeStaticModule } from "@nestjs/serve-static";
import { join } from "node:path";
import { AppController } from "./app.controller";
import { EventsModule } from "./events/events.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), process.env.WEB_DIST_PATH ?? "apps/web/dist"),
      exclude: ["/api*"]
    }),
    EventsModule
  ],
  controllers: [AppController]
})
export class AppModule {}
