import { PrismaService } from "@/infra/database/prisma/prisma.service";
import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

@Injectable()
export class StallService {
  constructor(private prismaService: PrismaService) {}

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

  async create(data: Prisma.StallCreateInput) {
    return this.prismaService.stall.create({
      data,
    });
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
