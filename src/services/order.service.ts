import { PrismaService } from "@/infra/database/prisma/prisma.service";
import {
  CreateOrderDto,
  UpdateOrderStatusDto,
} from "@/infra/http/controllers/order.controller";
import type { CheckoutOrderDto } from "@/infra/http/controllers/order.controller";
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@/generated/prisma/client";
import { StallService } from "./stall.service";
import { OrdersGateway } from "@/infra/http/gateways/order.gateway";
import type { Env } from "@/infra/env";
import type { PaymentConfirmedBody } from "@/utils/payment-hmac";
import { verifyPaymentSignature } from "@/utils/payment-hmac";
import { randomBytes } from "crypto";
import { OrderStatus } from "@/generated/prisma/client";

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
    private orderGateway: OrdersGateway,
    private configService: ConfigService<Env, true>,
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
      if (order.status === OrderStatus.AWAITING_PAYMENT) {
        const updated = await this.prismaService.order.update({
          where: { id: orderId },
          data: { status: dto.status },
        });
        this.orderGateway.emitOrdersToStall(order.stallId);
        return updated;
      }
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

  async createCheckoutOrder(data: CheckoutOrderDto) {
    const { items, stallId, buyerName } = data;

    const stall = await this.stallService.stallExists(stallId);
    if (!stall) {
      throw new NotFoundException("Barraca não encontrada");
    }

    const productsIds = items.map((item) => item.productId);
    const products = await this.prismaService.product.findMany({
      where: { id: { in: productsIds } },
    });

    if (products.length !== items.length) {
      throw new BadRequestException("Algum produto não existe");
    }

    let orderTotal = 0;

    for (const item of items) {
      const prod = products.find((p) => p.id === item.productId)!;
      if (prod.stallId !== stallId) {
        throw new BadRequestException(
          `Produto ${prod.name} não pertence a esta barraca`,
        );
      }
      if (prod.quantity < item.quantity) {
        throw new BadRequestException(`Estoque de ${prod.name} insuficiente`);
      }
      orderTotal += prod.price * item.quantity;
    }

    const orderItemsData = items.map((item) => {
      const prod = products.find((p) => p.id === item.productId)!;
      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: prod.price,
        lineTotal: prod.price * item.quantity,
      };
    });

    const order = await this.prismaService.order.create({
      data: {
        stallId,
        buyerName,
        total: orderTotal,
        status: OrderStatus.AWAITING_PAYMENT,
        items: { create: orderItemsData },
      },
      include: { items: { include: { product: true } } },
    });

    const baseUrl = this.configService.get("PAYMENTS_MS_URL", { infer: true }).replace(/\/$/, "");
    const mpItems = order.items.map((line) => ({
      id: String(line.productId),
      title: line.product.name,
      quantity: line.quantity,
      unit_price: line.unitPrice,
    }));

    let backUrls = data.back_urls;
    if (data.return_base_url) {
      const b = data.return_base_url.replace(/\/$/, "");
      backUrls = {
        success: `${b}/pedido/${order.id}/sucesso`,
        failure: `${b}/pagamento/falha?orderId=${order.id}`,
        pending: `${b}/pagamento/pendente?orderId=${order.id}`,
      };
    }
    if (!backUrls) {
      throw new BadRequestException("back_urls ou return_base_url é obrigatório");
    }

    const externalRef = `festa:${order.id}`;
    const res = await fetch(`${baseUrl}/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        external_reference: externalRef,
        items: mpItems,
        back_urls: backUrls,
        metadata: { orderId: order.id, stallId },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      await this.prismaService.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.CANCELED },
      });
      throw new InternalServerErrorException(
        `Falha ao criar checkout: ${res.status} ${errText.slice(0, 200)}`,
      );
    }

    const mp = (await res.json()) as {
      init_point: string;
      preference_id: string;
      sandbox_init_point?: string;
    };

    return {
      orderId: order.id,
      init_point: mp.init_point,
      sandbox_init_point: mp.sandbox_init_point,
      preference_id: mp.preference_id,
    };
  }

  async confirmPaymentFromWebhook(
    payload: PaymentConfirmedBody,
    signature: string | undefined,
  ) {
    const secret = this.configService.get("INTERNAL_PAYMENTS_HMAC_SECRET", {
      infer: true,
    });
    if (!verifyPaymentSignature(payload, signature, secret)) {
      throw new BadRequestException("Assinatura inválida");
    }

    if (!payload.external_reference.startsWith("festa:")) {
      throw new BadRequestException("Referência inválida");
    }

    const orderId = Number(payload.external_reference.replace("festa:", ""));
    if (Number.isNaN(orderId)) {
      throw new BadRequestException("ID de pedido inválido");
    }

    const order = await this.prismaService.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) {
      throw new NotFoundException("Pedido não encontrado");
    }

    if (order.mercadoPagoPaymentId === payload.payment_id) {
      return { ok: true, orderId: order.id };
    }

    if (order.status !== OrderStatus.AWAITING_PAYMENT) {
      return { ok: true, orderId: order.id };
    }

    if (payload.status !== "approved") {
      return { ok: true, orderId: order.id };
    }

    const products = await this.prismaService.product.findMany({
      where: { id: { in: order.items.map((i) => i.productId) } },
    });

    if (products.length !== order.items.length) {
      throw new InternalServerErrorException("Produtos do pedido inconsistentes");
    }

    for (const item of order.items) {
      const prod = products.find((p) => p.id === item.productId)!;
      if (prod.quantity < item.quantity) {
        throw new InternalServerErrorException(
          `Estoque insuficiente para confirmar pedido ${orderId}: ${prod.name}`,
        );
      }
    }

    await this.prismaService.$transaction(async (tx) => {
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: { decrement: item.quantity } },
        });
      }
      await tx.stockOut.createMany({
        data: order.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          reason: "VENDA_ONLINE",
        })),
      });

      for (const item of order.items) {
        const token = randomBytes(18).toString("base64url");
        await tx.orderItem.update({
          where: { id: item.id },
          data: { pickupToken: token },
        });
      }

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.PREPARING,
          mercadoPagoPaymentId: payload.payment_id,
        },
      });
    });

    await this.orderGateway.emitOrdersToStall(order.stallId);

    return { ok: true, orderId: order.id };
  }

  async getOrderWithPickupForPublic(orderId: number) {
    const order = await this.prismaService.order.findUnique({
      where: { id: orderId },
      include: {
        stall: true,
        items: { include: { product: true } },
      },
    });
    if (!order) throw new NotFoundException("Pedido não encontrado");
    if (order.status === OrderStatus.AWAITING_PAYMENT) {
      throw new BadRequestException("Pagamento ainda não confirmado");
    }
    return order;
  }

  async getPickupByToken(pickupToken: string) {
    const item = await this.prismaService.orderItem.findFirst({
      where: { pickupToken },
      include: {
        product: true,
        order: { include: { stall: true } },
      },
    });
    if (!item) {
      throw new NotFoundException("Token de retirada inválido");
    }
    return {
      orderId: item.orderId,
      quantity: item.quantity,
      productName: item.product.name,
      stallName: item.order.stall.name,
      lineTotal: item.lineTotal,
    };
  }
}
