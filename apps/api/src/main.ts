import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const allowedOrigins = process.env.CORS_ORIGIN?.split(",").map((origin) =>
    origin.trim()
  );

  app.setGlobalPrefix("api");
  app.enableCors({
    credentials: true,
    origin: allowedOrigins?.length ? allowedOrigins : true
  });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
}

void bootstrap();
