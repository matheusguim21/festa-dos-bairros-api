import { Module } from "@nestjs/common";
import { AuthenticationController } from "./controllers/authentication.controller";
import { PrismaService } from "../database/prisma/prisma.service";
import { AuthenticationService } from "@/services/auth.service";
import { UserService } from "@/services/user.service";
import { ProductsService } from "@/services/products.service";
import { StallController } from "./controllers/stall.controller";
import { StallService } from "@/services/stall.service";
import { ProductsController } from "./controllers/products.controller";
import { UserController } from "./controllers/user.controller";
import { OrderService } from "@/services/order.service";
import { OrdersController } from "./controllers/order.controller";
import { OrdersGateway } from "./gateways/order.gateway";
import { ReportService } from "@/services/reports.service";
import { ReportController } from "./controllers/reports.controller";
import { ResetPricesController } from "@/services/reset.controller";
import { ResetPricesService } from "@/services/reset-prices.service";

@Module({
  controllers: [
    AuthenticationController,
    StallController,
    ProductsController,
    UserController,
    OrdersController,
    ReportController,
    ResetPricesController,
  ],
  providers: [
    PrismaService,
    AuthenticationService,
    UserService,
    OrderService,
    ProductsService,
    StallService,
    OrdersGateway,
    ReportService,
    ResetPricesService,
  ],
})
export class HttpModule {}
