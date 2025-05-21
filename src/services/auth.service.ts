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
  constructor(private jwtService: JwtService) {}

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
}
