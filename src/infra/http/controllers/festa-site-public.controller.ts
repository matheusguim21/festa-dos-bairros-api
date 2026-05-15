import { FestaGalleryService } from "@/services/festa-gallery.service";
import { FestaSiteConfigService } from "@/services/festa-site-config.service";
import { Controller, Get } from "@nestjs/common";

@Controller("festa-site")
export class FestaSitePublicController {
  constructor(
    private readonly galleryService: FestaGalleryService,
    private readonly siteConfigService: FestaSiteConfigService,
  ) {}

  @Get("gallery")
  gallery() {
    return this.galleryService.findAllPublic();
  }

  @Get("config")
  config() {
    return this.siteConfigService.getPublic();
  }
}
