import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const allowedOrigins =
    process.env.CORS_ORIGIN?.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean) ?? [];

  if (process.env.NODE_ENV === "production" && allowedOrigins.length === 0) {
    throw new Error("CORS_ORIGIN is required in production");
  }

  app.setGlobalPrefix("api");
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true
    })
  );
  app.enableCors({
    credentials: true,
    origin: allowedOrigins.length ? allowedOrigins : true
  });

  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? "0.0.0.0";
  await app.listen(port, host);
}

void bootstrap();
