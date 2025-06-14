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

    const schema = [
      {
        column: "Produto",
        type: String,
        value: (row: any) => row.name,
      },
      {
        column: "Barraca",
        type: String,
        value: (row: any) => row.stall.name,
      },
      {
        column: "Preço Unitário (R$)",
        type: Number,
        format: "#,##0.00",
        value: (row: any) => row.price,
      },
      {
        column: "Unidades Vendidas",
        type: Number,
        value: (row: any) => row.totalSold,
      },
      {
        column: "Receita Total (R$)",
        type: Number,
        format: "#,##0.00",
        value: (row: any) => row.revenue,
      },
    ];

    const buffer = await writeXlsxFile(result.content, {
      schema,
      buffer: true,
      sheet: "Mais Vendidos",
    });

    return buffer;
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
