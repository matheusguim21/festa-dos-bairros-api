import { PrismaService } from "@/infra/database/prisma/prisma.service";
import {
  CreateProductRequest,
  UpdateProductRequest,
} from "@/infra/http/controllers/products.controller";
import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

interface FindAllProductsProps {
  search?: string;
  skip: number;
  take: number;
  stallId?: number;
}
@Injectable()
export class ProductsService {
  constructor(private prismaService: PrismaService) {}

  async findAllProducts({ skip, take, search, stallId }: FindAllProductsProps) {
    const where: Prisma.ProductWhereInput = {
      ...(search && {
        name: {
          contains: search,
          mode: Prisma.QueryMode.insensitive,
        },
      }),
      ...(stallId && { stallId }),
    };

    const [products, totalElements] = await this.prismaService.$transaction([
      this.prismaService.product.findMany({
        where,
        skip,
        take,
        orderBy: { name: "asc" },
        include: {
          stall: true,
        },
      }),
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

  async updateProduct(data: UpdateProductRequest) {
    if (data.operation !== "NOONE") {
      const [product] = await this.prismaService.$transaction([
        this.prismaService.product.update({
          data: {
            name: data.name,
            price: data.price,
            quantity:
              data.operation === "IN"
                ? {
                    increment: data.quantity,
                  }
                : {
                    decrement: data.quantity,
                  },
            criticalStock: data.criticalStock,
          },
          where: {
            id: data.productId,
          },
        }),
        data.operation === "IN"
          ? this.prismaService.stockIn.create({
              data: {
                quantity: data.quantity!,
                productId: data.productId,
                reason: "REPOSIÇÃO DE ESTOQUE",
              },
            })
          : this.prismaService.stockOut.create({
              data: {
                quantity: data.quantity!,
                productId: data.productId,
                reason: "REPOSIÇÃO DE ESTOQUE",
              },
            }),
      ]);
      return product;
    }
    return await this.prismaService.product.update({
      data: {
        name: data.name,
        price: data.price,

        criticalStock: data.criticalStock,
      },
      where: {
        id: data.productId,
      },
    });
  }
  // async findAllByStallId(
  //   stallId: number,
  //   { skip, take, search }: FindAllProductsProps
  // ) {
  //   const where: Prisma.ProductWhereInput = search
  //     ? {
  //         name: {
  //           contains: search,
  //           mode: Prisma.QueryMode.insensitive,
  //         },
  //         stallId, // Prisma permite isso diretamente
  //       }
  //     : {
  //         stallId,
  //       };

  //   const findManyArgs: Prisma.ProductFindManyArgs = {
  //     where,
  //     orderBy: { name: "asc" },
  //     ...(typeof skip === "number" ? { skip } : {}),
  //     ...(typeof take === "number" ? { take } : {}),
  //   };

  //   const [products, totalElements] = await this.prismaService.$transaction([
  //     this.prismaService.product.findMany(findManyArgs),
  //     this.prismaService.product.count({ where }),
  //   ]);

  //   return {
  //     content: products,
  //     totalElements,
  //     page: skip && take ? Math.floor(skip / take) : 0,
  //     limit: take ?? totalElements,
  //     totalPages: take ? Math.ceil(totalElements / take) : 1,
  //   };
  // }
}
