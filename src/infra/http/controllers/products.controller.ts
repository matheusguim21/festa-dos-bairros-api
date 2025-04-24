import { ProductsService } from "@/services/products.service";
import { Controller, Get, Param, UsePipes } from "@nestjs/common";
import { z } from "zod";
import { ZodValidationPipe } from "../pipes/zod-validation-pipe";

const getAllByNameSchema = z.string();

@Controller("products")
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get()
  async getAll() {
    return await this.productsService.getAll();
  }
  @UsePipes(new ZodValidationPipe(getAllByNameSchema))
  @Get(":productName")
  async getAllByName(@Param("productName") productName: string) {
    return await this.productsService.getAllByName(productName);
  }
}
