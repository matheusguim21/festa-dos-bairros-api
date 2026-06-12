import { GetBestSellingProductsFilter } from "@/dtos/getBestSellingProducts";
import { JWTAuthGuard } from "@/infra/auth/jwt.auth-guard";
import type { TokenPayload } from "@/infra/auth/jwt.strategy";
import { resolveReportStallScope } from "@/infra/auth/resolve-report-stall-scope";
import { ReportService } from "@/services/reports.service";
import { UserService } from "@/services/user.service";
import {
  Controller,
  DefaultValuePipe,
  Get,
  Logger,
  NotFoundException,
  ParseIntPipe,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import type { FastifyReply } from "fastify";

@Controller("reports")
@UseGuards(JWTAuthGuard)
export class ReportController {
  constructor(
    private reportService: ReportService,
    private userService: UserService,
  ) {}

  private async resolveStallId(
    userId: number,
    stallId?: string,
  ): Promise<number | undefined> {
    const user = await this.userService.findUserById(userId);
    if (!user) {
      throw new NotFoundException("Usuário não encontrado");
    }
    const requestedStallId = stallId ? Number(stallId) : undefined;
    return resolveReportStallScope(user, requestedStallId);
  }

  @Get()
  async getBestSellingProducts(
    @Req() req: { user?: TokenPayload },
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
    @Query("date") date?: string,
  ) {
    const userId = req.user?.user_id;
    if (!userId) {
      throw new UnauthorizedException("Usuário não autenticado");
    }

    const effectiveStallId = await this.resolveStallId(userId, stallId);

    const filters: GetBestSellingProductsFilter = {
      page,
      limit,
      search,
      stallId: effectiveStallId,
      sortBy,
      date,
    };

    return this.reportService.getBestSellingProducts(filters);
  }

  @Get("best-selling-products/excel")
  async downloadExcel(
    @Req() req: { user?: TokenPayload },
    @Res() reply: FastifyReply,
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
    @Query("date") date?: string,
  ) {
    const userId = req.user?.user_id;
    if (!userId) {
      throw new UnauthorizedException("Usuário não autenticado");
    }

    const effectiveStallId = await this.resolveStallId(userId, stallId);

    const filters: GetBestSellingProductsFilter = {
      page,
      limit,
      search,
      stallId: effectiveStallId,
      sortBy,
      date,
    };
    Logger.log("Filters: ", filters);

    const buffer = await this.reportService.generateBestSellingProductsExcel(
      filters,
    );
    Logger.log("Gerando relatório Excel de mais vendidos");

    const filename = date
      ? `produtos-mais-vendidos_${date}.xlsx`
      : `produtos-mais-vendidos-complete.xlsx`;

    reply
      .header(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      )
      .header("Content-Disposition", `attachment; filename=${filename}`)
      .send(buffer);
  }

  @Get("receita-total")
  async getTotalRevenue(@Req() req: { user?: TokenPayload }) {
    const userId = req.user?.user_id;
    if (!userId) {
      throw new UnauthorizedException("Usuário não autenticado");
    }

    const effectiveStallId = await this.resolveStallId(userId);

    return this.reportService.getTotalRevenue(effectiveStallId);
  }
}
