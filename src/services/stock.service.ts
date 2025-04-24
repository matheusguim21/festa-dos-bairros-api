import { PrismaService } from "@/infra/database/prisma/prisma.service";
import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

@Injectable()
export class StockService {
  constructor(private prismaService: PrismaService) {}

  async getAll() {
    return await this.prismaService.stockItem.findMany({
      orderBy: {
        name: "asc",
      },
    });
  }

  async addStockItem(item: Prisma.StockItemCreateInput) {
    return await this.prismaService.stockItem.create({
      data: item,
    });
  }
  async getAllByName(itemName: string) {
    return await this.prismaService.stockItem.findMany({
      where: {
        name: itemName,
      },
      orderBy: {
        name: "asc",
      },
    });
  }
}
