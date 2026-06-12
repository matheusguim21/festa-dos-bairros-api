import { PaymentMethod } from "@/generated/prisma/client";
import { PrismaService } from "@/infra/database/prisma/prisma.service";
import type { CreateTokenSaleDto } from "@/infra/http/controllers/token-sale.controller";
import {
  BadRequestException,
  Injectable,
} from "@nestjs/common";

const ALLOWED_FICHA_VALUES = [1, 2, 5, 10, 20, 25, 100] as const;

@Injectable()
export class TokenSaleService {
  constructor(private readonly prismaService: PrismaService) {}

  async createTokenSale(userId: number, data: CreateTokenSaleDto) {
    const { items, paymentMethod, buyerName, amountReceived } = data;

    for (const item of items) {
      if (
        !ALLOWED_FICHA_VALUES.includes(
          item.fichaValue as (typeof ALLOWED_FICHA_VALUES)[number],
        )
      ) {
        throw new BadRequestException(
          `Valor de ficha inválido: ${item.fichaValue}`,
        );
      }
      if (item.quantity <= 0) {
        throw new BadRequestException("Quantidade deve ser maior que zero");
      }
    }

    const itemsData = items.map((item) => ({
      fichaValue: item.fichaValue,
      quantity: item.quantity,
      unitPrice: item.fichaValue,
      lineTotal: item.fichaValue * item.quantity,
    }));

    const total = itemsData.reduce((acc, item) => acc + item.lineTotal, 0);

    if (total <= 0) {
      throw new BadRequestException("Total da venda deve ser maior que zero");
    }

    let changeAmount: number | null = null;
    let received: number | null = null;

    if (paymentMethod === PaymentMethod.CASH) {
      if (amountReceived == null) {
        throw new BadRequestException(
          "Informe o valor recebido para pagamento em dinheiro",
        );
      }
      if (amountReceived < total) {
        throw new BadRequestException(
          "Valor recebido é menor que o total da venda",
        );
      }
      received = amountReceived;
      changeAmount = amountReceived - total;
    }

    const sale = await this.prismaService.tokenSale.create({
      data: {
        userId,
        buyerName,
        total,
        paymentMethod,
        amountReceived: received,
        changeAmount,
        items: {
          create: itemsData,
        },
      },
      include: {
        items: true,
      },
    });

    return sale;
  }
}
