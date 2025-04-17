import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthenticationController } from "./http/controllers/authentication.controller";
import { PrismaService } from "./database/prisma/prisma.service";
import { envSchema } from "./env";
import { AuthModule } from "./auth/auth.module";
import { log } from "console";
import { JwtService } from "@nestjs/jwt";
import { HttpModule } from "./http/http.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      validate: (env) => {
        return envSchema.parse(env);
      },
      isGlobal: true,
    }),
    AuthModule,
    HttpModule,
  ],

  providers: [],
})
export class AppModule {}
