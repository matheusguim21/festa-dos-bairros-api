import { StockService } from "@/services/stock.service";
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Res,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import { ZodValidationPipe } from "../pipes/zod-validation-pipe";
import { coerce, z } from "zod";
import { JWTAuthGuard } from "@/infra/auth/jwt.auth-guard";
import { Response } from "express";

const StockQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1), // coerce = converte string para número
  limit: z.coerce.number().min(1).max(100).default(10),
});

const stockItemCreateSchema = z.object({
  name: z.string(),
  quantity: z.number().min(1),
  unit: z.string(),
});

type CreateStockItem = z.infer<typeof stockItemCreateSchema>;
type StockQueryDto = z.infer<typeof StockQuerySchema>;

@Controller("/stock")
// @UseGuards(JWTAuthGuard)
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

  @Post()
  @HttpCode(201)
  @UsePipes(new ZodValidationPipe(stockItemCreateSchema))
  async createStockItem(
    @Res({ passthrough: true }) res: Response,
    @Body() item: CreateStockItem
  ) {
    console.log("Chegou aqui");
    try {
      const response = await this.stockService.addStockItem(item);
      console.log("Response: ", response);

      return {
        message: "Produto de estoque criado com sucesso",
        data: response,
      };
    } catch (error: any) {
      console.log("Chegou aqui  no erro");
      throw error;
    }
  }
}
