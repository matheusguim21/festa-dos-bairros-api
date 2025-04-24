import { StockService } from "@/services/stock.service";
import { Controller, Get, HttpCode, UsePipes } from "@nestjs/common";
import { ZodValidationPipe } from "../pipes/zod-validation-pipe";
import { z } from "zod";

const getAllProductsByNameSchema = z.object({
  productName: z.string(),
});

@Controller("/stock")
export class StockController {
  constructor(private stockService: StockService) {}

  @Get("/all")
  @HttpCode(200)
  async getAllStockItems() {
    try {
      const response = await this.stockService.getAll();
      console.log("StockItems: ", response);
      return response;
    } catch (error) {
      throw error;
    }
  }
}
