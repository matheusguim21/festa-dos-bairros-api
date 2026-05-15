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
import { InternalPaymentsController } from "./controllers/internal-payments.controller";
import { OrdersGateway } from "./gateways/order.gateway";
import { ReportService } from "@/services/reports.service";
import { ReportController } from "./controllers/reports.controller";
import { ResetPricesController } from "@/services/reset.controller";
import { ResetPricesService } from "@/services/reset-prices.service";
import { SponsorsController } from "./controllers/sponsors.controller";
import { SponsorService } from "@/services/sponsor.service";
import { FestaSitePublicController } from "./controllers/festa-site-public.controller";
import { AdminSponsorsController } from "./controllers/admin-sponsors.controller";
import { AdminFestaGalleryController } from "./controllers/admin-festa-gallery.controller";
import { AdminFestaSiteConfigController } from "./controllers/admin-festa-site-config.controller";
import { AdminSiteUploadController } from "./controllers/admin-site-upload.controller";
import { FestaGalleryService } from "@/services/festa-gallery.service";
import { FestaSiteConfigService } from "@/services/festa-site-config.service";
import { FestaS3Service } from "../storage/festa-s3.service";
import { AdminGuard } from "../auth/admin.guard";
import { AdminOrSelfGuard } from "../auth/admin-or-self.guard";
import { AdminManagerScreensController } from "./controllers/admin-manager-screens.controller";
import { AdminAppRolesController } from "./controllers/admin-app-roles.controller";
import { ManagerRbacService } from "@/services/manager-rbac.service";

@Module({
  controllers: [
    AuthenticationController,
    StallController,
    ProductsController,
    UserController,
    OrdersController,
    InternalPaymentsController,
    ReportController,
    ResetPricesController,
    SponsorsController,
    FestaSitePublicController,
    AdminSponsorsController,
    AdminFestaGalleryController,
    AdminFestaSiteConfigController,
    AdminSiteUploadController,
    AdminManagerScreensController,
    AdminAppRolesController,
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
    SponsorService,
    FestaGalleryService,
    FestaSiteConfigService,
    FestaS3Service,
    AdminGuard,
    AdminOrSelfGuard,
    ManagerRbacService,
  ],
})
export class HttpModule {}
