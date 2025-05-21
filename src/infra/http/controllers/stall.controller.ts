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
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { z } from "zod";
import { ZodValidationPipe } from "../pipes/zod-validation-pipe";
import { Prisma, Stall, User } from "@prisma/client";

const createStallSchema = z.object({
  stallName: z.string(),
  stallHolderName: z.string(),
  username: z.string(),
  password: z.string(),
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

  @Post()
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
  async update(
    @Param("id") id: string,
    @Body() updateStallDto: Partial<Stall>
  ): Promise<Stall> {
    try {
      return await this.stallService.update(Number(id), updateStallDto);
    } catch (error) {
      throw new HttpException(
        "Erro ao atualizar barraca",
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Delete(":id")
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
