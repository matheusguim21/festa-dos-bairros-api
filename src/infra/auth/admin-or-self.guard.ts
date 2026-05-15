import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma/prisma.service";
import { Role } from "@/generated/prisma/client";
import type { TokenPayload } from "./jwt.strategy";

@Injectable()
export class AdminOrSelfGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{
      user?: TokenPayload;
      params?: { userId?: string };
    }>();
    const payload = req.user;
    if (!payload?.user_id) {
      throw new ForbiddenException();
    }

    const paramId = Number(req.params?.userId);
    if (Number.isNaN(paramId) || paramId < 1) {
      throw new ForbiddenException();
    }

    if (payload.user_id === paramId) {
      return true;
    }

    const actor = await this.prisma.user.findUnique({
      where: { id: payload.user_id },
      select: { role: true, appRole: { select: { isAdmin: true } } },
    });
    if (actor?.role === Role.ADMIN || actor?.appRole?.isAdmin) {
      return true;
    }

    throw new ForbiddenException();
  }
}
