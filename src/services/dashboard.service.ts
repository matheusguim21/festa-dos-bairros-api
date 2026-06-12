import { Injectable } from "@nestjs/common";
import { OrderStatus, Prisma } from "@/generated/prisma/client";
import { PrismaService } from "@/infra/database/prisma/prisma.service";
import { getFestivalDateWindow } from "@/infra/utils/festival-date-window";

const VALID_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.PREPARING,
  OrderStatus.DELIVERED,
];

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private buildOrderWhere(date?: string): Prisma.OrderWhereInput {
    const where: Prisma.OrderWhereInput = {
      status: { in: VALID_ORDER_STATUSES },
    };

    if (date) {
      const { windowStart, windowEnd } = getFestivalDateWindow(date);
      where.createdAt = { gte: windowStart, lt: windowEnd };
    }

    return where;
  }

  private buildOrderItemWhere(date?: string): Prisma.OrderItemWhereInput {
    return { order: { is: this.buildOrderWhere(date) } };
  }

  private buildTokenSaleWhere(date?: string): Prisma.TokenSaleWhereInput {
    if (!date) return {};

    const { windowStart, windowEnd } = getFestivalDateWindow(date);
    return { createdAt: { gte: windowStart, lt: windowEnd } };
  }

  async getSummary(date?: string) {
    const orderWhere = this.buildOrderWhere(date);
    const tokenSaleWhere = this.buildTokenSaleWhere(date);

    const [productAgg, ordersCount, tokenAgg, tokenSalesCount] =
      await Promise.all([
        this.prisma.orderItem.aggregate({
          where: { order: { is: orderWhere } },
          _sum: { lineTotal: true },
        }),
        this.prisma.order.count({ where: orderWhere }),
        this.prisma.tokenSale.aggregate({
          where: tokenSaleWhere,
          _sum: { total: true },
        }),
        this.prisma.tokenSale.count({ where: tokenSaleWhere }),
      ]);

    const productRevenue = productAgg._sum.lineTotal ?? 0;
    const tokenRevenue = tokenAgg._sum.total ?? 0;

    return {
      productRevenue,
      tokenRevenue,
      totalRevenue: productRevenue + tokenRevenue,
      ordersCount,
      tokenSalesCount,
      revenueSplit: {
        products: productRevenue,
        tokens: tokenRevenue,
      },
    };
  }

  async getTopProducts(date?: string, limit = 10) {
    const where = this.buildOrderItemWhere(date);

    const [byQuantity, byRevenue] = await Promise.all([
      this.prisma.orderItem.groupBy({
        by: ["productId"],
        where,
        _sum: { quantity: true, lineTotal: true },
        orderBy: { _sum: { quantity: Prisma.SortOrder.desc } },
        take: limit,
      }),
      this.prisma.orderItem.groupBy({
        by: ["productId"],
        where,
        _sum: { quantity: true, lineTotal: true },
        orderBy: { _sum: { lineTotal: Prisma.SortOrder.desc } },
        take: limit,
      }),
    ]);

    const productIds = [
      ...new Set([
        ...byQuantity.map((i) => i.productId),
        ...byRevenue.map((i) => i.productId),
      ]),
    ];

    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { stall: true },
    });

    const enrich = (
      items: typeof byQuantity,
    ): Array<{
      productId: number;
      name: string;
      stallName: string;
      quantity: number;
      revenue: number;
    }> =>
      items.map((item) => {
        const product = products.find((p) => p.id === item.productId)!;
        return {
          productId: item.productId,
          name: product.name,
          stallName: product.stall.name,
          quantity: item._sum.quantity ?? 0,
          revenue: item._sum.lineTotal ?? 0,
        };
      });

    return {
      byQuantity: enrich(byQuantity),
      byRevenue: enrich(byRevenue),
    };
  }

  async getTokenSales(date?: string) {
    const tokenSaleWhere = this.buildTokenSaleWhere(date);
    const itemWhere: Prisma.TokenSaleItemWhereInput = tokenSaleWhere.createdAt
      ? { tokenSale: { is: tokenSaleWhere } }
      : {};

    const [byFichaValue, byPaymentMethod] = await Promise.all([
      this.prisma.tokenSaleItem.groupBy({
        by: ["fichaValue"],
        where: itemWhere,
        _sum: { quantity: true, lineTotal: true },
        orderBy: { fichaValue: Prisma.SortOrder.asc },
      }),
      this.prisma.tokenSale.groupBy({
        by: ["paymentMethod"],
        where: tokenSaleWhere,
        _sum: { total: true },
        _count: { id: true },
      }),
    ]);

    return {
      byFichaValue: byFichaValue.map((row) => ({
        fichaValue: row.fichaValue,
        quantity: row._sum.quantity ?? 0,
        revenue: row._sum.lineTotal ?? 0,
      })),
      byPaymentMethod: byPaymentMethod.map((row) => ({
        paymentMethod: row.paymentMethod,
        revenue: row._sum.total ?? 0,
        count: row._count.id,
      })),
    };
  }
}
