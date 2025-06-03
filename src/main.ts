import { NestFactory } from "@nestjs/core";
import { AppModule } from "./infra/app.module";
import { ConfigService } from "@nestjs/config";
import { Env } from "./infra/env";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {});

  const configService: ConfigService<Env, true> = app.get(ConfigService);

  const port = configService.get("PORT", { infer: true });
  app.enableCors();
  await app.listen(port, "0.0.0.0");
}
bootstrap();
