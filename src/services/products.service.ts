import { PrismaService } from "@/infra/database/prisma/prisma.service";
import { AddProductRequestDTO } from "@/infra/http/controllers/products.controller";
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
      content: products,
      total,
      page: Math.floor(skip / take),
      limit: take,
      totalPages: Math.ceil(total / take),
    };
  }
  async getbyId(productId: number) {
    return await this.prismaService.product.findUnique({
      where: {
        id: productId,
      },
    });
  }
  async adddSaleItem(product: AddProductRequestDTO) {
    const { name, price, stallId } = product;

    const newProduct = await this.prismaService.product.create({
      data: {
        name,
        price,
        stallId, // Assuming your schema has stallId as a field
      },
    });

    return newProduct;
  }

  async deleteProduct(productId: number) {
    return await this.prismaService.product.delete({
      where: {
        id: productId,
      },
    });
  }
}
