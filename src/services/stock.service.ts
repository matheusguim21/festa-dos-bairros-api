import { PrismaService } from "@/infra/database/prisma/prisma.service";
import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

interface findAllProps {
  search?: string;
  skip: number;
  take: number;
}

@Injectable()
export class StockService {
  constructor(private prismaService: PrismaService) {}

  async findAll({ search, skip, take }: findAllProps) {
    const where: Prisma.StockItemWhereInput = search
      ? {
          name: {
            contains: search,
            mode: "insensitive",
          },
        }
      : {};

    const [items, total] = await this.prismaService.$transaction([
      this.prismaService.stockItem.findMany({
        where,
        skip,
        take,
      }),
      this.prismaService.stockItem.count({ where }),
    ]);

    return {
      content: items,
      total,
      page: Math.floor(skip / take),
      limit: take,
      totalPages: Math.ceil(total / take),
    };
  }

  async addStockItem(item: Prisma.StockItemCreateInput) {
    return await this.prismaService.stockItem.create({
      data: item,
    });
  }
}
