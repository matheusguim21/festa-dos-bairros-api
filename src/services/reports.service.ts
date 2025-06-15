import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma/prisma.service";
import { GetBestSellingProductsFilter } from "@/dtos/getBestSellingProducts";
import { Prisma } from "@prisma/client";
import { Workbook } from "exceljs";

@Injectable()
export class ReportService {
  constructor(private prisma: PrismaService) {}

  private buildWhereBase(
    filters: GetBestSellingProductsFilter,
    windowStart?: Date,
    windowEnd?: Date
  ): Prisma.OrderItemWhereInput {
    const where: Prisma.OrderItemWhereInput = {};

    // Filtro por barraca
    if (filters.stallId) {
      where.order = { is: { stallId: filters.stallId } };
    }

    // Filtro de busca
    if (filters.search) {
      where.product = {
        name: { contains: filters.search, mode: "insensitive" },
      };
    }

    // Filtro de janela de horário (18h do dia até 1h do dia seguinte)
    if (windowStart && windowEnd) {
      const baseOrder = (where.order as any)?.is || {};
      where.order = {
        is: {
          ...baseOrder,
          createdAt: { gte: windowStart, lt: windowEnd },
        },
      };
    }

    return where;
  }

  private async getSalesWindow(
    filters: Omit<GetBestSellingProductsFilter, "date"> & {
      windowStart?: Date;
      windowEnd?: Date;
    }
  ) {
    const { page = 0, limit, sortBy, windowStart, windowEnd } = filters;
    const skip = page * limit;
    const where = this.buildWhereBase(filters, windowStart, windowEnd);

    const orderBy =
      sortBy === "revenue"
        ? { _sum: { lineTotal: Prisma.SortOrder.desc } }
        : sortBy === "name"
        ? undefined
        : { _sum: { quantity: Prisma.SortOrder.desc } };

    const params: any = {
      by: ["productId"],
      where,
      _sum: { quantity: true, lineTotal: true },
      skip,
      take: limit,
    };
    if (orderBy) params.orderBy = orderBy;

    const items = await this.prisma.orderItem.groupBy(params);
    const allDistinct = await this.prisma.orderItem.groupBy({
      by: ["productId"],
      where,
    });
    const overall = await this.prisma.orderItem.aggregate({
      where,
      _sum: { quantity: true, lineTotal: true },
    });

    const productIds = items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { stall: true },
    });

    let enriched = items.map((item) => {
      const p = products.find((x) => x.id === item.productId)!;
      return {
        id: p.id,
        name: p.name,
        stall: p.stall,
        price: p.price,
        quantity: p.quantity,
        criticalStock: p.criticalStock,
        totalSold: item._sum?.quantity || 0,
        revenue: item._sum?.lineTotal || 0,
      };
    });

    if (sortBy === "stock-asc")
      enriched.sort((a, b) => a.quantity - b.quantity);
    if (sortBy === "stock-desc")
      enriched.sort((a, b) => b.quantity - a.quantity);

    return {
      content: enriched,
      totalElements: allDistinct.length,
      page,
      limit,
      totalPages: Math.ceil(allDistinct.length / limit),
      totalUnitsSold: overall._sum.quantity || 0,
      totalRevenue: overall._sum.lineTotal || 0,
    };
  }

  async getBestSellingProducts(filters: GetBestSellingProductsFilter) {
    // Se data fornecida, calcula janela de 18h do dia até 1h da manhã do dia seguinte
    if (filters.date) {
      const day = filters.date; // e.g. "2025-06-10"

      const windowStart = new Date(`${day}T18:00:00-03:00`);
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = nextDay.toISOString().slice(0, 10);
      const windowEnd = new Date(`${nextDayStr}T05:00:00-03:00`);

      return this.getSalesWindow({ ...filters, windowStart, windowEnd });
    }

    // Sem data → retorna tudo sem filtrar por horário
    return this.getSalesWindow({ ...filters });
  }

  async generateBestSellingProductsExcel(
    filters: GetBestSellingProductsFilter
  ): Promise<Buffer> {
    const workbook = new Workbook();

    if (filters.date) {
      const day = filters.date; // “YYYY-MM-DD”
      const windowStart = new Date(`${day}T18:00:00-03:00`);

      const next = new Date(day);
      next.setDate(next.getDate() + 1);
      const nextDayStr = next.toISOString().slice(0, 10);

      // Aqui você aumenta para 05:00:
      const windowEnd = new Date(`${nextDayStr}T05:00:00-03:00`);

      const data = await this.getSalesWindow({
        ...filters,
        page: 0,
        windowStart,
        windowEnd,
      });
      this.buildSheet(workbook, `Dia ${day}`, data);
    } else {
      // Relatório completo (sem data) → única aba
      const allData = await this.getSalesWindow({ ...filters, page: 0 });
      this.buildSheet(workbook, "Relatório Completo", allData);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private buildSheet(
    wb: Workbook,
    title: string,
    data: Awaited<ReturnType<ReportService["getSalesWindow"]>>
  ) {
    const ws = wb.addWorksheet(title);
    ws.columns = [
      { header: "Produto", key: "name", width: 30 },
      { header: "Barraca", key: "stall", width: 25 },
      { header: "Preço Unitário (R$)", key: "price", width: 20 },
      { header: "Unidades Vendidas", key: "totalSold", width: 20 },
      { header: "Receita Total (R$)", key: "revenue", width: 20 },
    ];

    // Cabeçalho estilizado
    const header = ws.getRow(1);
    header.height = 20;
    header.eachCell((cell, idx) => {
      const colors = [
        "FF0070F3",
        "FFF97316",
        "FF10B981",
        "FF6366F1",
        "FFEF4444",
      ];
      const bg = colors[idx - 1] || colors[0];
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    // Dados
    data.content.forEach((r) => {
      ws.addRow({
        name: r.name,
        stall: r.stall.name,
        price: r.price,
        totalSold: r.totalSold,
        revenue: r.revenue,
      });
    });

    // Totais
    ws.addRow([]);
    const totalRow = ws.addRow({
      name: "Totais",
      totalSold: data.totalUnitsSold,
      revenue: data.totalRevenue,
    });
    ws.mergeCells(`A${totalRow.number}:C${totalRow.number}`);
    ["A", "D", "E"].forEach((col) => {
      const c = totalRow.getCell(col);
      c.font = { bold: true };
      c.alignment = { vertical: "middle", horizontal: "center" };
    });

    // Formatação
    ws.getColumn("price").numFmt = "R$ #,##0.00";
    ws.getColumn("revenue").numFmt = "R$ #,##0.00";
  }

  async getTotalRevenue() {
    const result = await this.prisma.order.aggregate({ _sum: { total: true } });
    return { totalRevenue: result._sum.total || 0 };
  }
}
