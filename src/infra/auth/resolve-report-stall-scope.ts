import { ForbiddenException } from "@nestjs/common";
import { Role } from "@/generated/prisma/client";
import type { PublicUser } from "@/services/user.service";

export function resolveReportStallScope(
  user: PublicUser,
  requestedStallId?: number,
): number | undefined {
  const isAdmin =
    user.role === Role.ADMIN || Boolean(user.appRole?.isAdmin);

  if (isAdmin) {
    return requestedStallId;
  }

  const hasRelatoriosAccess = user.allowedScreens.some(
    (s) => s.key === "relatorios",
  );
  if (!hasRelatoriosAccess) {
    throw new ForbiddenException("Sem permissão para acessar relatórios");
  }

  const userStallId = user.stall?.id;
  if (!userStallId) {
    throw new ForbiddenException("Usuário sem barraca vinculada");
  }

  if (
    requestedStallId !== undefined &&
    requestedStallId !== userStallId
  ) {
    throw new ForbiddenException(
      "Não é permitido consultar relatórios de outra barraca",
    );
  }

  return userStallId;
}
