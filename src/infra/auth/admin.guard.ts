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
export class AdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{ user?: TokenPayload }>();
    const payload = req.user;
    if (!payload?.user_id) {
      throw new ForbiddenException();
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.user_id },
      select: { role: true, appRole: { select: { isAdmin: true } } },
    });
    const isAdmin =
      user?.role === Role.ADMIN || Boolean(user?.appRole?.isAdmin);
    if (!user || !isAdmin) {
      throw new ForbiddenException("Apenas administradores");
    }
    return true;
  }
}
