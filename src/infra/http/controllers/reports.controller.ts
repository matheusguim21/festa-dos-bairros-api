// src/controllers/report.controller.ts
import { GetBestSellingProductsFilter } from "@/dtos/getBestSellingProducts";
import { ReportService } from "@/services/reports.service";
import {
  Controller,
  DefaultValuePipe,
  Get,
  Logger,
  ParseIntPipe,
  Query,
  Res,
} from "@nestjs/common";
import { Response } from "express";

@Controller("reports")
export class ReportController {
  constructor(private reportService: ReportService) {}

  @Get()
  @Get()
  async getBestSellingProducts(
    @Query("page", new DefaultValuePipe(0), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query("search") search?: string,
    @Query("stallId") stallId?: string,
    @Query("sortBy")
    sortBy:
      | "totalSold"
      | "revenue"
      | "name"
      | "stock-asc"
      | "stock-desc" = "totalSold"
  ) {
    const skip = page * limit;

    return this.reportService.getBestSellingProducts({
      page,
      limit,
      search,
      stallId: stallId ? Number(stallId) : undefined,
      sortBy,
      skip,
    });
  }

  @Get("receita-total")
  async getTotalRevenue() {
    return this.reportService.getTotalRevenue();
  }
  @Get("best-selling-products/excel")
  async downloadExcel(
    @Query() query: GetBestSellingProductsFilter,
    @Res() res: Response
  ) {
    const buffer = await this.reportService.generateBestSellingProductsExcel(
      query
    );
    Logger.log("Chegou aqui");

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=produtos-mais-vendidos.xlsx"
    );

    res.end(buffer);
  }
}
