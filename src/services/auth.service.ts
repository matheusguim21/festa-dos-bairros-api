import { PrismaService } from "@/infra/database/prisma/prisma.service";
import { Env } from "@/infra/env";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { z } from "zod";

const refreshPayloadSchema = z.object({
  sub: z.string(),
  user_id: z.number(),
});

@Injectable()
export class AuthenticationService {
  constructor(
    private jwtService: JwtService,
    private config: ConfigService<Env, true>,
    private prisma: PrismaService,
  ) {}

  generateTokens(payload: { sub: string; user_id: number }) {
    const refreshSecret = this.config.get("JWT_REFRESH_SECRET", {
      infer: true,
    });

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: "15m",
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: "7d",
      secret: refreshSecret,
      algorithm: "HS256",
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  async refreshTokens(refreshToken: string) {
    const refreshSecret = this.config.get("JWT_REFRESH_SECRET", {
      infer: true,
    });

    let raw: unknown;
    try {
      raw = await this.jwtService.verifyAsync(refreshToken, {
        secret: refreshSecret,
        algorithms: ["HS256"],
      });
    } catch {
      throw new UnauthorizedException("Refresh token inválido ou expirado");
    }

    const parsed = refreshPayloadSchema.safeParse(raw);
    if (!parsed.success) {
      throw new UnauthorizedException("Refresh token inválido ou expirado");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: parsed.data.user_id },
      select: { id: true },
    });
    if (!user) {
      throw new UnauthorizedException("Refresh token inválido ou expirado");
    }

    return this.generateTokens({
      sub: parsed.data.sub,
      user_id: parsed.data.user_id,
    });
  }
}
