import { PrismaService } from "@/infra/database/prisma/prisma.service";
import {
  CreateOrderDto,
  UpdateOrderStatusDto,
} from "@/infra/http/controllers/order.controller";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { StallService } from "./stall.service";
import { OrdersGateway } from "@/infra/http/gateways/order.gateway";

interface FindAllOrdersProps {
  search?: string;
  skip: number;
  take: number;
  stallId?: number;
}

@Injectable()
export class OrderService {
  constructor(
    private prismaService: PrismaService,
    private stallService: StallService,
    private orderGateway: OrdersGateway
  ) {}

  async findAllOrders({ skip, take, search, stallId }: FindAllOrdersProps) {
    const where: Prisma.OrderWhereInput = {
      ...(stallId && { stallId }),
      ...(search &&
        (stallId
          ? {
              buyerName: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            }
          : {
              items: {
                some: {
                  product: {
                    name: {
                      contains: search,
                      mode: Prisma.QueryMode.insensitive,
                    },
                  },
                },
              },
            })),
    };

    const orderBy = stallId
      ? [{ status: "desc" as const }, { date: "desc" as const }]
      : { date: "desc" as const };

    const [orders, totalElements] = await this.prismaService.$transaction([
      this.prismaService.order.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          stall: true,
        },
      }),
      this.prismaService.order.count({ where }),
    ]);

    return {
      content: orders,
      totalElements,
      page: skip && take ? Math.floor(skip / take) : 0,
      limit: take ?? totalElements,
      totalPages: take ? Math.ceil(totalElements / take) : 1,
    };
  }

  async createOrder(data: CreateOrderDto) {
    const { items, stallId, buyerName } = data;

    const stall = await this.stallService.stallExists(stallId);

    if (!stall) {
      throw new NotFoundException("Barraca não encontrada");
    }
    const productsIds = items.map((item) => item.productId);
    const products = await this.prismaService.product.findMany({
      where: {
        id: { in: productsIds },
      },
    });

    if (products.length !== items.length) {
      throw new BadRequestException("Algum produto não existe");
    }

    let orderTotal = 0;

    for (const item of items) {
      const prod = products.find((p) => p.id === item.productId)!;
      if (prod.quantity < item.quantity) {
        throw new BadRequestException(`Estoque de ${prod.name} insuficiente`);
      }
      orderTotal += prod.price * item.quantity;
    }

    const orderItemsData = items.map((item) => {
      const prod = products.find((prod) => prod.id === item.productId)!;

      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: prod.price,
        lineTotal: prod.price * item.quantity,
      };
    });
    const [order] = await this.prismaService.$transaction([
      this.prismaService.order.create({
        data: {
          stallId,
          buyerName,
          total: orderTotal,
          items: { create: orderItemsData },
        },
      }),
      ...items.map((item) =>
        this.prismaService.product.update({
          where: {
            id: item.productId,
          },
          data: {
            quantity: {
              decrement: item.quantity,
            },
          },
        })
      ),
      this.prismaService.stockOut.createMany({
        data: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          reason: "VENDA",
        })),
      }),
    ]);
    await this.orderGateway.emitOrdersToStall(stallId); // ✅
    return order;
  }
  async updateStatus(orderId: number, dto: UpdateOrderStatusDto) {
    const order = await this.prismaService.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException("Pedido não encontrado");
    if (dto.status === "CANCELED") {
      const productUpdates = order.items.map((item) =>
        this.prismaService.product.update({
          where: { id: item.productId },
          data: { quantity: { increment: item.quantity } },
        })
      );
      const transaction = await this.prismaService.$transaction([
        this.prismaService.order.update({
          where: { id: orderId },
          data: { status: dto.status },
        }),
        ...productUpdates,
      ]);
      this.orderGateway.emitOrdersToStall(order.stallId);

      return transaction;
    }
    const update = await this.prismaService.order.update({
      where: { id: orderId },
      data: { status: dto.status },
    });
    this.orderGateway.emitOrdersToStall(order.stallId);

    return update;
  }

  async findAllOrderItemsByOrderId(orderId: number) {
    return await this.prismaService.orderItem.findMany({
      where: {
        orderId,
      },
      orderBy: {
        product: {
          name: "asc",
        },
      },
      select: {
        product: true,
        quantity: true,
      },
    });
  }
}
