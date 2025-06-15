// src/reset-prices/reset-prices.service.ts
import { DEFAULT_PRICES } from "@/dtos/default-prices";
import { PrismaService } from "@/infra/database/prisma/prisma.service";
import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class ResetPricesService {
  private readonly logger = new Logger(ResetPricesService.name);

  constructor(private prisma: PrismaService) {}

  async resetAll(): Promise<{ updated: number; skipped: number }> {
    let updated = 0;
    let skipped = 0;

    for (const { name, price } of DEFAULT_PRICES) {
      const res = await this.prisma.product.updateMany({
        where: { name },
        data: { price },
      });

      if (res.count > 0) {
        this.logger.log(`"${name}" → R$${price.toFixed(2)} (${res.count})`);
        updated += res.count;
      } else {
        this.logger.warn(`Produto não encontrado: "${name}"`);
        skipped++;
      }
    }

    return { updated, skipped };
  }
}
