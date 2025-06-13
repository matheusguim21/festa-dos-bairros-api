import { ProductsService } from "@/services/products.service";
import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import { number, string, z } from "zod";
import { ZodValidationPipe } from "../pipes/zod-validation-pipe";
import { NotFoundError } from "rxjs";
import { Prisma } from "@prisma/client";
import { Response } from "express";
import { JWTAuthGuard } from "@/infra/auth/jwt.auth-guard";

const getById = z.coerce.number();

const ProductQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1), // coerce = converte string para número
  limit: z.coerce.number().min(1).max(100).default(10),
});

const createProductSchema = z.object({
  name: z.string(),
  price: z.number(),
  quantity: z.number(),
  stallId: z.number(),
  criticalStock: z.number().optional(),
});
const updateProductSchema = z.object({
  productId: z.number(),
  name: z.string().optional(),
  price: z.number().optional(),
  quantity: z.number().optional(),
  criticalStock: z.number().optional(),
  stallId: z.number().optional(),
  operation: z.enum(["IN", "OUT", "NOONE"]),
});
const deleteProductSchema = z.coerce.number();

export type UpdateProductRequest = z.infer<typeof updateProductSchema>;

type DeleteProductRequestDTO = z.infer<typeof deleteProductSchema>;

type ProductQueryDTO = z.infer<typeof ProductQuerySchema>;

export type CreateProductRequest = z.infer<typeof createProductSchema>;
@Controller("/products")
// @UseGuards(JWTAuthGuard)
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get()
  @HttpCode(200)
  @UsePipes(new ZodValidationPipe(ProductQuerySchema))
  async getAll(@Query() query: ProductQueryDTO) {
    const { limit, page, search } = query;

    const skip = (page - 1) * limit;

    return await this.productsService.findAll({
      skip,
      search,
      take: limit,
    });
  }

  @UsePipes(new ZodValidationPipe(getById))
  @Get(":productId")
  async getbyId(@Param("productId") productId: number) {
    try {
      const response = await this.productsService.getbyId(productId);
      if (response) {
        return response;
      }
      throw new NotFoundException("Produto não encontrado");
    } catch (error: any) {
      return error;
    }
  }

  @Post()
  @UsePipes(new ZodValidationPipe(createProductSchema))
  async createProduct(@Body() product: CreateProductRequest) {
    try {
      const response = await this.productsService.createProduct(product);
      return {
        message: "Produto adicionado com sucesso",
        data: response,
      };
    } catch (error: any) {
      console.error(error);
      throw error;
    }
  }

  @Put()
  @UsePipes(new ZodValidationPipe(updateProductSchema))
  async updateProducts(@Body() body: UpdateProductRequest) {
    try {
      const response = await this.productsService.updateProduct(body);

      return {
        message: "Produto  atualizado com sucesso",
        content: response,
      };
    } catch (error) {
      throw error;
    }
  }

  @Delete(":productId")
  @UsePipes(new ZodValidationPipe(deleteProductSchema))
  @HttpCode(204)
  async deleteProductById(
    @Res({
      passthrough: true,
    })
    res: Response,
    @Param("productId")
    productId: DeleteProductRequestDTO
  ) {
    try {
      return await this.productsService.deleteProduct(productId);
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        res.status(404);
        return new NotFoundException("Produto inexistente");
      }
      return error;
    }
  }

  @Get("stall/:stallId/")
  @HttpCode(200)
  async getAllByStallID(
    @Param("stallId", ParseIntPipe) stallId: number,
    @Query(new ZodValidationPipe(ProductQuerySchema)) query: ProductQueryDTO
  ) {
    const { limit, page, search } = query;

    const skip = (page - 1) * limit;

    return await this.productsService.findAllByStallId(stallId, {
      skip,
      search,
      take: limit,
    });
  }
}
