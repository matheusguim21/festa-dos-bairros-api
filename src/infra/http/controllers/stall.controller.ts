import { JWTAuthGuard } from "@/infra/auth/jwt.auth-guard";
import { AdminGuard } from "@/infra/auth/admin.guard";
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
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { z } from "zod";
import { ZodValidationPipe } from "../pipes/zod-validation-pipe";
import { Stall } from "@/generated/prisma/client";

const updateStallBodySchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    imageUrl: z
      .union([z.string().url().max(2048), z.literal(""), z.null()])
      .optional(),
  })
  .transform((d) => ({
    ...d,
    imageUrl: d.imageUrl === "" ? null : d.imageUrl,
  }))
  .refine((d) => d.name !== undefined || d.imageUrl !== undefined, {
    message: "Informe ao menos o nome ou a URL da imagem",
  });

const createStallSchema = z.object({
  stallName: z.string(),
  stallHolderName: z.string(),
  username: z.string(),
  password: z.string(),
  imageUrl: z.string().max(2048).optional().nullable(),
});

export type CreateStallRequest = z.infer<typeof createStallSchema>;

@Controller("/stalls")
// @UseGuards(JWTAuthGuard) // Habilite quando quiser proteger os endpoints
export class StallController {
  constructor(private readonly stallService: StallService) {}

  @Get()
  async findAll(): Promise<Stall[]> {
    try {
      return await this.stallService.getAll();
    } catch (error) {
      throw new HttpException(
        "Erro ao buscar barracas",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get("/user/:id")
  async findOneByUserId(@Param("id") id: string): Promise<Stall | null> {
    try {
      const stall = await this.stallService.getByUserId(Number(id));
      if (!stall) {
        throw new HttpException(
          "Stall não encontrada para o usuário",
          HttpStatus.NOT_FOUND
        );
      }
      return stall;
    } catch (error) {
      throw new HttpException(
        "Erro ao buscar stall por usuário",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get(":id")
  async findOne(@Param("id") id: string): Promise<Stall> {
    const n = Number(id);
    if (!Number.isInteger(n) || n < 1) {
      throw new HttpException("Barraca não encontrada", HttpStatus.NOT_FOUND);
    }
    const stall = await this.stallService.stallExists(n);
    if (!stall) {
      throw new HttpException("Barraca não encontrada", HttpStatus.NOT_FOUND);
    }
    return stall;
  }

  @Post()
  @UseGuards(JWTAuthGuard, AdminGuard)
  @UsePipes(new ZodValidationPipe(createStallSchema))
  async create(@Body() createStallDto: CreateStallRequest): Promise<Stall> {
    try {
      const stall = await this.stallService.create(createStallDto);
      return { ...stall };
    } catch (error) {
      throw new HttpException("Erro ao criar barraca", HttpStatus.BAD_REQUEST);
    }
  }

  @Put(":id")
  @UseGuards(JWTAuthGuard, AdminGuard)
  @UsePipes(new ZodValidationPipe(updateStallBodySchema))
  async update(
    @Param("id") id: string,
    @Body() updateStallDto: z.infer<typeof updateStallBodySchema>,
  ): Promise<Stall> {
    const n = Number(id);
    if (!Number.isInteger(n) || n < 1) {
      throw new HttpException("Barraca não encontrada", HttpStatus.NOT_FOUND);
    }
    try {
      return await this.stallService.update(n, updateStallDto);
    } catch (error) {
      throw new HttpException(
        "Erro ao atualizar barraca",
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Delete(":id")
  @UseGuards(JWTAuthGuard, AdminGuard)
  async remove(@Param("id") id: string): Promise<Stall> {
    try {
      return await this.stallService.delete(Number(id));
    } catch (error) {
      throw new HttpException(
        "Erro ao deletar barraca",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
