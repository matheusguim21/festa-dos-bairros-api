import { StockService } from "@/services/stock.service";
import {
  Controller,
  Get,
  HttpCode,
  Query,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import { ZodValidationPipe } from "../pipes/zod-validation-pipe";
import { z } from "zod";
import { JWTAuthGuard } from "@/infra/auth/jwt.auth-guard";

const StockQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1), // coerce = converte string para número
  limit: z.coerce.number().min(1).max(100).default(10),
});

type StockQueryDto = z.infer<typeof StockQuerySchema>;

@Controller("/stock")
@UseGuards(JWTAuthGuard)
export class StockController {
  constructor(private stockService: StockService) {}

  @Get()
  @HttpCode(200)
  @UsePipes(new ZodValidationPipe(StockQuerySchema))
  async findAll(@Query() query: StockQueryDto) {
    const { search, page, limit } = query;

    const skip = (page - 1) * limit;

    return this.stockService.findAll({ search, skip, take: limit });
  }
}
