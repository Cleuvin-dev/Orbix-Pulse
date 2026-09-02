import "reflect-metadata";

import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("v1");
  // apps/web roda em outra origem (porta) em dev — sem isso o browser bloqueia
  // toda chamada a /v1/auth/me antes mesmo de a API responder.
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
    credentials: true,
  });
  const port = process.env.PORT ?? 3001;
  await app.listen(port);
}

bootstrap();
