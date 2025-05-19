import { PrismaService } from "@/infra/database/prisma/prisma.service";
import {
  CreateUserRequest,
  LoginRequest,
} from "@/infra/http/controllers/authentication.controller";
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { compare, hash } from "bcryptjs";
import { JwtService } from "@nestjs/jwt";
import { UserService } from "./user.service";

@Injectable()
export class AuthenticationService {
  constructor(
    private prismaService: PrismaService,
    private userService: UserService,
    private jwtService: JwtService
  ) {}

  generateTokens(payload: { sub: string; user_id: number }) {
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: "15m", // ou outro valor curto
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: "7d",
      secret: process.env.JWT_REFRESH_SECRET,
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  async register(user: CreateUserRequest) {
    console.log("Usuárior recebido", user);
    const userExists = await this.userService.userExists(user.username);

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
}
