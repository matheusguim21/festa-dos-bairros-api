import { PrismaService } from "@/infra/database/prisma/prisma.service";
import { CreateStallRequest } from "@/infra/http/controllers/stall.controller";
import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { hash } from "bcryptjs";
import { AuthenticationService } from "./auth.service";
import { UserService } from "./user.service";

@Injectable()
export class StallService {
  constructor(
    private prismaService: PrismaService,
    private userService: UserService
  ) {}
  async stallExists(stallId: number) {
    return await this.prismaService.stall.findUnique({
      where: {
        id: stallId,
      },
    });
  }
  async getAll() {
    return this.prismaService.stall.findMany({
      orderBy: {
        name: "asc",
      },
    });
  }

  async getByUserId(id: number) {
    const user = await this.prismaService.user.findUnique({
      where: { id },
      include: { stall: true }, // stallId está no User
    });

    return user?.stall ?? null;
  }
  async create(data: CreateStallRequest) {
    try {
      const stall = await this.prismaService.stall.create({
        data: {
          name: data.stallName,
        },
      });

      return stall;
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
