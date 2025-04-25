import { PrismaService } from "@/infra/database/prisma/prisma.service";
import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

interface FindAllProductsProps {
  search?: string;
  skip: number;
  take: number;
}
@Injectable()
export class ProductsService {
  constructor(private prismaService: PrismaService) {}

  async adddSaleItem(item: Prisma.ProductCreateInput) {
    return await this.prismaService.product.create({
      data: item,
    });
  }

  async findAll({ skip, take, search }: FindAllProductsProps) {
    const where: Prisma.ProductWhereInput = search
      ? {
          name: {
            contains: search,
            mode: Prisma.QueryMode.insensitive,
          },
        }
      : {};

    const [products, total] = await this.prismaService.$transaction([
      this.prismaService.product.findMany({
        where,
        skip,
        take,
      }),
      this.prismaService.product.count({
        where,
      }),
    ]);

    return {
      data: products,
      total,
      page: Math.floor(skip / take),
      limit: take,
      totalPages: Math.floor(total / take),
    };
  }
  async getbyId(productId: number) {
    return await this.prismaService.product.findUnique({
      where: {
        id: productId,
      },
    });
  }
}
