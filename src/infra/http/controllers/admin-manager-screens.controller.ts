import { JWTAuthGuard } from "@/infra/auth/jwt.auth-guard";
import { AdminGuard } from "@/infra/auth/admin.guard";
import { ManagerRbacService } from "@/services/manager-rbac.service";
import { Controller, Get, UseGuards } from "@nestjs/common";

@Controller("/admin/manager-screens")
@UseGuards(JWTAuthGuard, AdminGuard)
export class AdminManagerScreensController {
  constructor(private readonly rbac: ManagerRbacService) {}

  @Get()
  async list() {
    await this.rbac.syncScreenCatalogFromDefaults();
    return this.rbac.listScreens();
  }
}
