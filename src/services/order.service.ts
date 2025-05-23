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

interface FindAllOrdersProps {
  search?: string;
  skip: number;
  take: number;
}

@Injectable()
export class OrderService {
  constructor(
    private prismaService: PrismaService,
    private stallService: StallService
  ) {}

  async findAllOrders({ skip, take, search }: FindAllOrdersProps) {
    const where: Prisma.OrderWhereInput = search
      ? {
          items: {
            some: {
              product: {
                name: {
                  contains: search,
                },
              },
            },
          },
        }
      : {};

    const [orders, totalElements] = await this.prismaService.$transaction([
      this.prismaService.order.findMany({
        where,
        orderBy: {
          date: "desc",
        },
        skip,
        take,
      }),
      this.prismaService.order.count({
        where,
      }),
    ]);

    return {
      content: orders,
      totalElements,
      page: Math.floor(skip / take),
      limit: take,
      totalPages: Math.ceil(totalElements / take),
    };
  }
  async findAllOrdersByStallId(
    stallId: number,
    { skip, take, search }: FindAllOrdersProps
  ) {
    const where: Prisma.OrderWhereInput = search
      ? {
          buyerName: {
            contains: search,
          },
          AND: {
            stallId,
          },
        }
      : {
          stallId,
        };

    const [orders, totalElements] = await this.prismaService.$transaction([
      this.prismaService.order.findMany({
        where,
        orderBy: {
          date: "desc",
        },
        skip,
        take,
      }),
      this.prismaService.order.count({
        where,
      }),
    ]);

    return {
      content: orders,
      totalElements,
      page: Math.floor(skip / take),
      limit: take,
      totalPages: Math.ceil(totalElements / take),
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
      return await this.prismaService.$transaction([
        this.prismaService.order.update({
          where: { id: orderId },
          data: { status: dto.status },
        }),
        ...productUpdates,
      ]);
    }
    return this.prismaService.order.update({
      where: { id: orderId },
      data: { status: dto.status },
    });
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
