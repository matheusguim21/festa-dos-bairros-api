import { ForbiddenException } from "@nestjs/common";
import { Role } from "@/generated/prisma/client";
import type { PublicUser } from "@/services/user.service";

export function assertDashboardAccess(user: PublicUser): void {
  const isAdmin =
    user.role === Role.ADMIN || Boolean(user.appRole?.isAdmin);

  if (!isAdmin) {
    throw new ForbiddenException("Apenas administradores podem acessar o dashboard");
  }

  const hasDashboardScreen = user.allowedScreens.some(
    (s) => s.key === "dashboard",
  );

  if (!hasDashboardScreen) {
    throw new ForbiddenException("Sem permissão para acessar o dashboard");
  }
}
