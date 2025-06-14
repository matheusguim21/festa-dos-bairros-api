// src/services/report.service.ts
import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma/prisma.service";
import { GetBestSellingProductsFilter } from "@/dtos/getBestSellingProducts";
import { Prisma } from "@prisma/client";
// src/services/report.service.ts
import writeXlsxFile from "write-excel-file/node";
import { filter } from "rxjs";
import { Workbook } from "exceljs";
@Injectable()
export class ReportService {
  constructor(private prisma: PrismaService) {}

  async getBestSellingProducts(filters: GetBestSellingProductsFilter) {
    const { page, limit, search, stallId, sortBy, skip } = filters;

    const where: Prisma.OrderItemWhereInput = {
      order: {
        ...(stallId ? { stallId } : {}),
      },
      ...(search
        ? {
            product: {
              name: {
                contains: search,
                mode: "insensitive",
              },
            },
          }
        : {}),
    };

    const orderBy =
      sortBy === "revenue"
        ? { _sum: { lineTotal: Prisma.SortOrder.desc } }
        : sortBy === "name"
        ? { product: { name: Prisma.SortOrder.asc } }
        : { _sum: { quantity: Prisma.SortOrder.desc } };

    const [items, total, overallUnits] = await this.prisma.$transaction([
      this.prisma.orderItem.groupBy({
        by: ["productId"],
        where,
        _sum: {
          quantity: true,
          lineTotal: true,
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.orderItem.count({ where }),
      this.prisma.orderItem.aggregate({
        where,
        _sum: {
          quantity: true,
        },
      }),
    ]);

    const productIds = items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { stall: true },
    });

    let enriched = items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!;
      return {
        id: product.id,
        name: product.name,
        stall: product.stall,
        price: product.price,
        quantity: product.quantity, // estoque
        criticalStock: product.criticalStock,
        totalSold: item._sum?.quantity || 0,
        revenue: item._sum?.lineTotal || 0,
      };
    });

    // Aplica ordenação manual por estoque se for o caso
    if (sortBy === "stock-asc") {
      enriched = enriched.sort((a, b) => a.quantity - b.quantity);
    } else if (sortBy === "stock-desc") {
      enriched = enriched.sort((a, b) => b.quantity - a.quantity);
    }

    return {
      content: enriched,
      totalElements: total,
      page: Math.floor(skip / limit),
      limit,
      totalPages: Math.ceil(total / limit),
      totalUnitsSold: overallUnits._sum.quantity || 0,
    };
  }

  async generateBestSellingProductsExcel(
    filters: GetBestSellingProductsFilter
  ): Promise<Buffer> {
    const result = await this.getBestSellingProducts({
      ...filters,
      limit: Number(filters.limit),
      page: Number(filters.page),
      stallId: Number(filters.stallId),
    });

    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet("Mais Vendidos");

    // Definição de colunas e larguras
    worksheet.columns = [
      { header: "Produto", key: "name", width: 30 },
      { header: "Barraca", key: "stall", width: 25 },
      { header: "Preço Unitário (R$)", key: "price", width: 20 },
      { header: "Unidades Vendidas", key: "totalSold", width: 20 },
      { header: "Receita Total (R$)", key: "revenue", width: 20 },
    ];

    // Estilizar cabeçalho
    const headerRow = worksheet.getRow(1);
    headerRow.height = 20;
    headerRow.eachCell((cell, colNumber) => {
      // Cores por coluna
      let bgColor = "FF0070F3"; // padrão azul
      if (colNumber === 2) bgColor = "FFF97316"; // laranja
      if (colNumber === 3) bgColor = "FF10B981"; // verde
      if (colNumber === 4) bgColor = "FF6366F1"; // roxo
      if (colNumber === 5) bgColor = "FFEF4444"; // vermelho

      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: bgColor },
      };
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    // Adicionar linhas de dados
    result.content.forEach((item) => {
      worksheet.addRow({
        name: item.name,
        stall: item.stall.name,
        price: item.price,
        totalSold: item.totalSold,
        revenue: item.revenue,
      });
    });

    // Opcional: formatar colunas numéricas
    worksheet.getColumn("price").numFmt = "R$ #,##0.00";
    worksheet.getColumn("revenue").numFmt = "R$ #,##0.00";

    // Gerar buffer e retornar
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
  async getTotalRevenue() {
    const result = await this.prisma.order.aggregate({
      _sum: {
        total: true,
      },
    });

    return {
      totalRevenue: result._sum.total || 0,
    };
  }
}
