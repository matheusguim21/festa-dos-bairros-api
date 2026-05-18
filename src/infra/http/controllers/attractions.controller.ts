import { AttractionsService } from "@/services/attractions.service";
import { Controller, Get, HttpException, HttpStatus, Logger, Param, ParseIntPipe } from "@nestjs/common";

@Controller("/attractions")
export class AttractionsController {
  constructor(private readonly attractionsService: AttractionsService) {}
  private readonly logger = new Logger(AttractionsController.name);
  @Get()
  async findAllPublic() {
    try {
      this.logger.log("Buscando atrações");
      const attractions = await this.attractionsService.findAllPublic();
      this.logger.log(`Encontradas ${attractions.length} atrações`);
      return attractions;
    } catch {
      throw new HttpException(
        "Erro ao buscar atrações",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  @Get(":id")
  async findOnePublic(@Param("id", ParseIntPipe) id: number) {
    try {
      return await this.attractionsService.findOnePublic(id);
    } catch {
      throw new HttpException(
        "Erro ao buscar atração",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
 
}
