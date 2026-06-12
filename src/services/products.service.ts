import { PrismaService } from "@/infra/database/prisma/prisma.service";
import {
  CreateProductRequest,
  UpdateProductRequest,
} from "@/infra/http/controllers/products.controller";
import { CriticalStockAlertService } from "@/services/critical-stock-alert.service";
import {
  accentInsensitiveNameSql,
  normalizeSearchString,
} from "@/utils/string-normalize";
import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@/generated/prisma/client";

interface FindAllProductsProps {
  search?: string;
  skip: number;
  take: number;
  stallId?: number;
}
@Injectable()
export class ProductsService {
  constructor(
    private prismaService: PrismaService,
    private criticalStockAlertService: CriticalStockAlertService,
  ) {}

  async findAllProducts({ skip, take, search, stallId }: FindAllProductsProps) {
    let productIdsFromSearch: number[] | undefined;

    if (search) {
      const normalizedSearch = normalizeSearchString(search);
      const stallFilter = stallId
        ? Prisma.sql`AND p."stallId" = ${stallId}`
        : Prisma.empty;

      const rows = await this.prismaService.$queryRaw<{ id: number }[]>`
        SELECT p.id
        FROM "Product" p
        WHERE ${accentInsensitiveNameSql('p."name"', normalizedSearch)}
        ${stallFilter}
      `;

      productIdsFromSearch = rows.map((row) => row.id);

      if (productIdsFromSearch.length === 0) {
        return {
          content: [],
          totalElements: 0,
          page: skip && take ? Math.floor(skip / take) : 0,
          limit: take ?? 0,
          totalPages: 0,
        };
      }
    }

    const where: Prisma.ProductWhereInput = {
      ...(productIdsFromSearch !== undefined && {
        id: { in: productIdsFromSearch },
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
      const existing = await this.prismaService.product.findUnique({
        where: { id: data.productId },
        include: { stall: true },
      });
      if (!existing) {
        throw new NotFoundException("Produto não encontrado");
      }

      const oldQty = existing.quantity;

      const [product] = await this.prismaService.$transaction([
        this.prismaService.product.update({
          data: {
            name: data.name,
            price: data.price,
            ...(data.description !== undefined
              ? { description: data.description }
              : {}),
            ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl } : {}),
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

      if (data.operation === "OUT") {
        this.criticalStockAlertService.evaluateAfterStockChange(
          {
            id: product.id,
            name: product.name,
            quantity: product.quantity,
            criticalStock: product.criticalStock,
            stall: existing.stall,
          },
          oldQty,
          product.quantity,
        );
      }

      return product;
    }
    return await this.prismaService.product.update({
      data: {
        name: data.name,
        price: data.price,
        ...(data.description !== undefined
          ? { description: data.description }
          : {}),
        ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl } : {}),
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
