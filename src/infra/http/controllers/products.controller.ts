import { ProductsService } from "@/services/products.service";
import {
  Controller,
  Get,
  HttpCode,
  Param,
  Query,
  UsePipes,
} from "@nestjs/common";
import { z } from "zod";
import { ZodValidationPipe } from "../pipes/zod-validation-pipe";

const getById = z.coerce.number();

const ProductQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1), // coerce = converte string para número
  limit: z.coerce.number().min(1).max(100).default(10),
});

type ProductQueryDTO = z.infer<typeof ProductQuerySchema>;
@Controller("/products")
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
    return await this.productsService.getbyId(productId);
  }
}
