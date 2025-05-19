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

@Injectable()
export class OrderService {
  constructor(private prismaService: PrismaService) {}

  async findAllOrders() {
    return await this.prismaService.order.findMany({
      orderBy: {
        date: "desc",
      },
    });
  }

  async createOrder(data: CreateOrderDto) {
    const { items, stallId, buyerName } = data;

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
    ]);
    return order;
  }

  async updateStatus(orderId: number, dto: UpdateOrderStatusDto) {
    const order = await this.prismaService.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException("Pedido não encontrado");

    return this.prismaService.order.update({
      where: { id: orderId },
      data: { status: dto.status },
    });
  }
}
