import { Module } from "@nestjs/common";
import { AuthenticationController } from "./controllers/authentication.controller";
import { PrismaService } from "../database/prisma/prisma.service";
import { AuthenticationService } from "@/services/auth.service";
import { UserService } from "@/services/user.service";
import { ProductsService } from "@/services/products.service";
import { StallController } from "./controllers/stall.controller";
import { StallService } from "@/services/stall.service";
import { ProductsController } from "./controllers/products.controller";

@Module({
  controllers: [AuthenticationController, StallController, ProductsController],
  providers: [
    PrismaService,
    AuthenticationService,
    UserService,

    ProductsService,
    StallService,
  ],
})
export class HttpModule {}
