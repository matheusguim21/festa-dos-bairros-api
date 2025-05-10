import { PrismaService } from "@/infra/database/prisma/prisma.service";
import { CreateStallRequest } from "@/infra/http/controllers/stall.controller";
import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { hash } from "bcryptjs";
import { AuthenticationService } from "./auth.service";

@Injectable()
export class StallService {
  constructor(
    private prismaService: PrismaService,
    private authService: AuthenticationService
  ) {}

  async getAll() {
    return this.prismaService.stall.findMany({
      orderBy: {
        name: "asc",
      },
    });
  }

  async getById(id: number) {
    return this.prismaService.stall.findUnique({
      where: { id },
    });
  }

  async create(data: CreateStallRequest) {
    try {
      console.log("Chegou aqui");
      const user = await this.authService.register({
        name: data.stallHolderName,
        username: data.username,
        password: await hash(data.password, 8),
        role: "STALL",
      });
      console.log("Usuário criado");

      return await this.prismaService.stall.create({
        data: {
          name: data.stallName,

          user: {
            connect: user,
          },
        },
      });
    } catch (error) {
      throw error;
    }
  }

  async update(id: number, data: { name?: string; description?: string }) {
    return this.prismaService.stall.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    return this.prismaService.stall.delete({
      where: { id },
    });
  }
}
