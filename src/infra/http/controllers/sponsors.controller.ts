import { SponsorService } from "@/services/sponsor.service";
import { Controller, Get, HttpException, HttpStatus } from "@nestjs/common";

@Controller("/sponsors")
export class SponsorsController {
  constructor(private readonly sponsorService: SponsorService) {}

  @Get()
  async findAllPublic() {
    try {
      return await this.sponsorService.findAllPublic();
    } catch {
      throw new HttpException(
        "Erro ao buscar patrocinadores",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
