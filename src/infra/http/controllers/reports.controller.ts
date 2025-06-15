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
      | "stock-desc" = "totalSold",
    @Query("date") date?: string // apenas um parâmetro de data
  ) {
    const filters: GetBestSellingProductsFilter = {
      page,
      limit,
      search,
      stallId: stallId ? Number(stallId) : undefined,
      sortBy,
      date, // undefined se não vier
    };

    return this.reportService.getBestSellingProducts(filters);
  }

  @Get("best-selling-products/excel")
  async downloadExcel(
    @Res() res: Response,
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
      | "stock-desc" = "totalSold",
    @Query("date") date?: string
  ) {
    const filters: GetBestSellingProductsFilter = {
      page,
      limit,
      search,
      stallId: stallId ? Number(stallId) : undefined,
      sortBy,
      date,
    };
    Logger.log("Filters: ", filters);

    const buffer = await this.reportService.generateBestSellingProductsExcel(
      filters
    );
    Logger.log("Gerando relatório Excel de mais vendidos");

    // nome de arquivo: se date, usa data; senão, relatório completo
    const filename = date
      ? `produtos-mais-vendidos_${date}.xlsx`
      : `produtos-mais-vendidos-complete.xlsx`;

    res
      .setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      )
      .setHeader("Content-Disposition", `attachment; filename=${filename}`)
      .end(buffer);
  }

  @Get("receita-total")
  async getTotalRevenue() {
    return this.reportService.getTotalRevenue();
  }
}
