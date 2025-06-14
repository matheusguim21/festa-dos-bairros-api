// src/services/report.service.ts
import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma/prisma.service";
import { GetBestSellingProductsFilter } from "@/dtos/getBestSellingProducts";
import { Prisma } from "@prisma/client";
// src/services/report.service.ts
import writeXlsxFile from "write-excel-file/node";
import { filter } from "rxjs";
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

    // 1) Mapear para ROWS compatíveis:
    const rows = result.content.map((item) => ({
      Produto: item.name,
      Barraca: item.stall.name,
      "Preço Unitário (R$)": item.price,
      "Unidades Vendidas": item.totalSold,
      "Receita Total (R$)": item.revenue,
    }));

    // 2) Definir a schema (com cores só no cabeçalho)
    const schema = [
      {
        column: "Produto",
        type: String,
        value: (row: any) => row.Produto,
        width: 30,
        color: "#ffffff",
        backgroundColor: "#0070f3",
        fontWeight: "bold",
      },
      {
        column: "Barraca",
        type: String,
        value: (row: any) => row.Barraca,
        backgroundColor: "#f97316",
        color: "#ffffff",
        fontWeight: "bold",
      },
      {
        column: "Preço Unitário (R$)",
        type: Number,
        value: (row: any) => row["Preço Unitário (R$)"],
        format: "#,##0.00",
        backgroundColor: "#10b981",
        color: "#ffffff",
        fontWeight: "bold",
      },
      {
        column: "Unidades Vendidas",
        type: Number,
        value: (row: any) => row["Unidades Vendidas"],
        backgroundColor: "#6366f1",
        color: "#ffffff",
        fontWeight: "bold",
      },
      {
        column: "Receita Total (R$)",
        type: Number,
        value: (row: any) => row["Receita Total (R$)"],
        format: "#,##0.00",
        backgroundColor: "#ef4444",
        color: "#ffffff",
        fontWeight: "bold",
      },
    ];

    // 3) Chamar writeXlsxFile com o array mapeado
    const buffer = await writeXlsxFile(
      rows as any,
      {
        schema,
        buffer: true,
        sheet: "Mais Vendidos",
      } as any
    );

    return buffer as unknown as Buffer;
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
