import { PrismaService } from "@/infra/database/prisma/prisma.service";
import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

@Injectable()
export class ProductsService {
  constructor(private prismaService: PrismaService) {}

  async adddSaleItem(item: Prisma.ProductCreateInput) {
    return await this.prismaService.product.create({
      data: item,
    });
  }

  async getAll() {
    return await this.prismaService.product.findMany({
      orderBy: {
        name: "asc",
      },
    });
  }
  async getAllByName(productName: string) {
    return await this.prismaService.product.findMany({
      where: {
        name: {
          contains: productName,
          mode: "insensitive",
        },
      },
      orderBy: {
        name: "asc",
      },
    });
  }
}
