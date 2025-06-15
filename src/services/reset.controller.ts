// src/reset-prices/reset-prices.controller.ts
import { Controller, Post, HttpCode, HttpStatus } from "@nestjs/common";
import { ResetPricesService } from "./reset-prices.service";

@Controller("/admin")
export class ResetPricesController {
  constructor(private readonly resetSvc: ResetPricesService) {}

  @Post("reset-prices")
  @HttpCode(HttpStatus.OK)
  async resetPrices() {
    const result = await this.resetSvc.resetAll();
    return {
      message: "Reset de preços concluído",
      updatedRecords: result.updated,
      skippedProducts: result.skipped,
    };
  }
}
