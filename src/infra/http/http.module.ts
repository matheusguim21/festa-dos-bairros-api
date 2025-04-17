import { Module } from "@nestjs/common";
import { AuthenticationController } from "./controllers/authentication.controller";
import { PrismaService } from "../database/prisma/prisma.service";
import { AuthenticationService } from "@/services/auth.service";
import { UserService } from "@/services/user.service";

@Module({
  controllers: [AuthenticationController],
  providers: [PrismaService, AuthenticationService, UserService],
})
export class HttpModule {}
