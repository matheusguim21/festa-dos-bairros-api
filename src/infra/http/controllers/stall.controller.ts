import { JWTAuthGuard } from "@/infra/auth/jwt.auth-guard";
import { StallService } from "@/services/stall.service";
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import { z } from "zod";
import { ZodValidationPipe } from "../pipes/zod-validation-pipe";
import { PrismaClientValidationError } from "@prisma/client/runtime/library";
import { Prisma, Stall } from "@prisma/client";

const createStallSchema = z.object({
  stallName: z.string(),
  stallHolderName: z.string(),
  username: z.string(),
  password: z.string(),
});

export type CreateStallRequest = z.infer<typeof createStallSchema>;

@Controller("/stalls")
// @UseGuards(JWTAuthGuard)
export class StallController {
  constructor(private readonly stallService: StallService) {}

  @Get()
  async findAll(): Promise<Stall[]> {
    try {
      const response = await this.stallService.getAll();
      return response;
    } catch (error) {
      return error;
    }
  }

  @Get("/user/:id")
  async findOneByUserId(@Param("id") id: string): Promise<Stall | null> {
    try {
      return await this.stallService.getByUserId(Number(id));
    } catch (error) {
      return error;
    }
  }

  @Post()
  @UsePipes(new ZodValidationPipe(createStallSchema))
  async create(@Body() createStallDto: CreateStallRequest) {
    try {
      return await this.stallService.create(createStallDto);
    } catch (error) {
      if (error instanceof PrismaClientValidationError) {
        return { errorMessage: error.message, errorCause: error.stack };
      }
    }
  }

  @Put(":id")
  async update(@Param("id") id: string, @Body() updateStallDto: any) {
    try {
      return await this.stallService.update(Number(id), updateStallDto);
    } catch (error) {
      return error;
    }
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    try {
      return await this.stallService.delete(Number(id));
    } catch (error) {
      return error;
    }
  }
}
