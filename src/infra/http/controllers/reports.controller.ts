// src/controllers/report.controller.ts
import { ReportService } from "@/services/reports.service";
import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
} from "@nestjs/common";

@Controller("reports")
export class ReportController {
  constructor(private reportService: ReportService) {}

  @Get()
  async getBestSellingProducts(
    @Query("page", new DefaultValuePipe(0), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query("search") search?: string,
    @Query("stallId") stallId?: string,
    @Query("sortBy") sortBy: "totalSold" | "revenue" | "name" = "totalSold"
  ) {
    const skip = page * limit;

    const result = await this.reportService.getBestSellingProducts({
      page,
      limit,
      search,
      stallId: Number(stallId),
      sortBy,
      skip,
    });

    return result;
  }
  @Get("receita-total")
  async getTotalRevenue() {
    return this.reportService.getTotalRevenue();
  }
}
