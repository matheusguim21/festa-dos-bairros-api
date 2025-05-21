import { PrismaService } from "@/infra/database/prisma/prisma.service";
import {
  CreateUserRequest,
  LoginRequest,
} from "@/infra/http/controllers/authentication.controller";
import { AddStallToUserRequest } from "@/infra/http/controllers/user.controller";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { compare } from "bcryptjs";
import { hash } from "bcryptjs";

@Injectable()
export class UserService {
  constructor(private prismaService: PrismaService) {}

  async findAll() {
    return await this.prismaService.user.findMany({
      orderBy: {
        name: "asc",
      },
    });
  }

  async userExists(username: string) {
    return await this.prismaService.user.findUnique({
      where: {
        username: username,
      },
    });
  }

  async findUserById(userId: number) {
    return await this.prismaService.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        name: true,
        role: true,
        stall: true,
        username: true,
      },
    });
  }
  async createUser(user: CreateUserRequest) {
    console.log("Usuárior recebido", user);
    const userExists = await this.userExists(user.username);

    if (userExists) {
      throw new BadRequestException("Esse usuário já existe");
    }

    const hashedPassword = await hash(user.password, 8);

    const createdUser = await this.prismaService.user.create({
      data: {
        name: user.name,
        username: user.username,
        password: hashedPassword,
        role: user.role,
        stallId: user.stallId,
      },
    });
    console.log("Usuário criado: ", createdUser);
    return createdUser;
  }

  async authenticateUser(request: LoginRequest) {
    const userExists = await this.prismaService.user.findUnique({
      where: {
        username: request.username,
      },
    });

    if (!userExists) {
      throw new BadRequestException("Usuário ou senha inválidos");
    }

    const doesPasswordMatches = await compare(
      request.password,
      userExists.password!
    );
    if (!doesPasswordMatches) {
      throw new BadRequestException("Usuário ou senha inválidos");
    }

    return userExists;
  }

  async addStallToUser({ stallId, userId }: AddStallToUserRequest) {
    const user = await this.findUserById(userId);
    const stall = await this.prismaService.stall.findUnique({
      where: {
        id: stallId,
      },
    });
    if (user && stall) {
      return await this.prismaService.user.update({
        data: {
          stallId: stallId,
        },
        where: user,
      });
    } else {
      throw new NotFoundException("Usuário  ou barraca não encontrados");
    }
  }
}
