import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import {
  getAllowedCorsOrigins,
  securityHeadersMiddleware
} from "./app-security";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const allowedOrigins = getAllowedCorsOrigins();

  app.setGlobalPrefix("api");
  app.use(securityHeadersMiddleware);
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
