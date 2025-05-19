import { PrismaService } from "@/infra/database/prisma/prisma.service";
import { CreateProductRequest } from "@/infra/http/controllers/products.controller";
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

    const [products, totalElements] = await this.prismaService.$transaction([
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
      totalElements,
      page: Math.floor(skip / take),
      limit: take,
      totalPages: Math.ceil(totalElements / take),
    };
  }
  async getbyId(productId: number) {
    return await this.prismaService.product.findUnique({
      where: {
        id: productId,
      },
    });
  }
  async createProduct(product: CreateProductRequest) {
    const newProduct = await this.prismaService.product.create({
      data: product,
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

  async findAllByStallId(
    stallId: number,
    { skip, take, search }: FindAllProductsProps
  ) {
    const where: Prisma.ProductWhereInput = search
      ? {
          name: {
            contains: search,
            mode: Prisma.QueryMode.insensitive,
          },
          stallId, // Prisma permite isso diretamente
        }
      : {
          stallId,
        };

    const findManyArgs: Prisma.ProductFindManyArgs = {
      where,
      orderBy: { name: "asc" },
      ...(typeof skip === "number" ? { skip } : {}),
      ...(typeof take === "number" ? { take } : {}),
    };

    const [products, totalElements] = await this.prismaService.$transaction([
      this.prismaService.product.findMany(findManyArgs),
      this.prismaService.product.count({ where }),
    ]);

    return {
      content: products,
      totalElements,
      page: skip && take ? Math.floor(skip / take) : 0,
      limit: take ?? totalElements,
      totalPages: take ? Math.ceil(totalElements / take) : 1,
    };
  }
}
