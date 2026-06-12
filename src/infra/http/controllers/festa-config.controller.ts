import { JWTAuthGuard } from "@/infra/auth/jwt.auth-guard";
import { FestaConfigService } from "@/services/festa-config.service";
import { Controller, Get, UseGuards } from "@nestjs/common";

@Controller("festa-config")
@UseGuards(JWTAuthGuard)
export class FestaConfigController {
  constructor(private readonly festaConfigService: FestaConfigService) {}

  @Get()
  getPublic() {
    return this.festaConfigService.getPublic();
  }
}
