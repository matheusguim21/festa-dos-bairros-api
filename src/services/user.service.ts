import { PrismaService } from "@/infra/database/prisma/prisma.service";
import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

@Injectable()
export class UserService {
  constructor(private prismaService: PrismaService) {}

  async userExists(username: string) {
    return await this.prismaService.user.findUnique({
      where: {
        username: username,
      },
    });
  }

  async createUser(user: Prisma.UserCreateInput) {
    const response = await this.prismaService.user.create({
      data: user,
    });

    console.log("Criando Usuário", response);
    return response;
  }

  async findUserById(userId: number) {
    return await this.prismaService.user.findUnique({
      where: {
        id: userId,
      },
    });
  }
}
