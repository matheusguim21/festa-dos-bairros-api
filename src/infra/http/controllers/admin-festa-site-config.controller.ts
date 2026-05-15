import { JWTAuthGuard } from "@/infra/auth/jwt.auth-guard";
import { AdminGuard } from "@/infra/auth/admin.guard";
import { FestaSiteConfigService } from "@/services/festa-site-config.service";
import { Body, Controller, Put, UseGuards, UsePipes } from "@nestjs/common";
import { z } from "zod";
import { ZodValidationPipe } from "../pipes/zod-validation-pipe";

const updateSiteConfigSchema = z.object({
  videoFileUrl: z.string().url().nullable().optional(),
  videoEmbedUrl: z.string().min(1).nullable().optional(),
});

@Controller("admin/festa-site")
@UseGuards(JWTAuthGuard, AdminGuard)
export class AdminFestaSiteConfigController {
  constructor(private readonly siteConfigService: FestaSiteConfigService) {}

  @Put("config")
  @UsePipes(new ZodValidationPipe(updateSiteConfigSchema))
  updateConfig(@Body() body: z.infer<typeof updateSiteConfigSchema>) {
    return this.siteConfigService.upsertConfig(body);
  }
}
