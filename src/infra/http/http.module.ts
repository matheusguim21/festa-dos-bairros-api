import { Module } from "@nestjs/common";
import { AuthenticationController } from "./controllers/authentication.controller";
import { PrismaService } from "../database/prisma/prisma.service";
import { AuthenticationService } from "@/services/auth.service";
import { UserService } from "@/services/user.service";
import { StockService } from "@/services/stock.service";
import { ProductsService } from "@/services/products.service";
import { StockController } from "./controllers/stock.controller";

@Module({
  controllers: [AuthenticationController, StockController],
  providers: [
    PrismaService,
    AuthenticationService,
    UserService,
    StockService,
    ProductsService,
  ],
})
export class HttpModule {}
