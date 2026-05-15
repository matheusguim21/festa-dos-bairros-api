import { NestFactory } from "@nestjs/core";
import { AppModule } from "./infra/app.module";
import { ConfigService } from "@nestjs/config";
import type { Env } from "./infra/env";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { fastifyMultipart } from "@fastify/multipart";

async function bootstrap() {
  const adapter = new FastifyAdapter();
  adapter.enableCors({
    origin: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
  );

  const fastify = app.getHttpAdapter().getInstance();
  await fastify.register(fastifyMultipart, {
    limits: { fileSize: 80 * 1024 * 1024 },
  });

  const configService = app.get(ConfigService<Env, true>);
  const port = configService.get("PORT", { infer: true });
  await app.listen(port, "0.0.0.0");
}
bootstrap();
