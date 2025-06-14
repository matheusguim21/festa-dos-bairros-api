// src/services/report.service.ts
import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma/prisma.service";
import { GetBestSellingProductsFilter } from "@/dtos/getBestSellingProducts";
import { Prisma } from "@prisma/client";
// src/services/report.service.ts
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
        ? { _sum: { lineTotal: "desc" as Prisma.SortOrder } }
        : sortBy === "name"
        ? { product: { name: "asc" } }
        : { _sum: { quantity: "desc" as Prisma.SortOrder } };

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

      // Aqui vem o total de unidades vendidas adaptável
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

    const enriched = items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!;
      return {
        id: product.id,
        name: product.name,
        stall: product.stall,
        price: product.price,
        totalSold: item._sum?.quantity || 0,
        revenue: item._sum?.lineTotal || 0,
      };
    });

    return {
      content: enriched,
      totalElements: total,
      page: Math.floor(skip / limit),
      limit,
      totalPages: Math.ceil(total / limit),
      totalUnitsSold: overallUnits._sum.quantity || 0, // <- 🔥 Aqui
    };
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
