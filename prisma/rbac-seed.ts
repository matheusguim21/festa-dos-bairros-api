import { type PrismaClient, Role } from "../src/generated/prisma/client";
import {
  LEGACY_ROLE_SCREEN_KEYS,
  MANAGER_SCREEN_SEEDS,
  legacyAppRoleSlug,
} from "../src/infra/rbac/rbac-defaults";

/**
 * Garante telas, papéis legados e vínculos; preenche `User.appRoleId` quando vazio.
 * Idempotente (pode rodar em todo seed / deploy).
 */
export async function ensureRbacInfrastructure(prisma: PrismaClient) {
  for (const s of MANAGER_SCREEN_SEEDS) {
    await prisma.managerScreen.upsert({
      where: { key: s.key },
      create: {
        key: s.key,
        pathSegment: s.pathSegment,
        label: s.label,
        sortOrder: s.sortOrder,
      },
      update: {
        pathSegment: s.pathSegment,
        label: s.label,
        sortOrder: s.sortOrder,
      },
    });
  }

  for (const role of Object.values(Role) as Role[]) {
    const slug = legacyAppRoleSlug(role);
    const keys = LEGACY_ROLE_SCREEN_KEYS[role];
    const isAdmin = role === Role.ADMIN;
    const displayName =
      role === Role.ADMIN
        ? "Administrador"
        : `Perfil ${role.replace(/_/g, " ")}`;

    const appRole = await prisma.appRole.upsert({
      where: { slug },
      create: {
        name: displayName,
        slug,
        isAdmin,
        mapsToRole: role,
      },
      update: {
        name: displayName,
        isAdmin,
        mapsToRole: role,
      },
    });

    await prisma.appRoleScreen.deleteMany({ where: { appRoleId: appRole.id } });
    for (const key of keys) {
      const screen = await prisma.managerScreen.findUnique({ where: { key } });
      if (!screen) {
        throw new Error(`ManagerScreen com key "${key}" não encontrada`);
      }
      await prisma.appRoleScreen.create({
        data: { appRoleId: appRole.id, screenId: screen.id },
      });
    }
  }

  const users = await prisma.user.findMany({
    select: { id: true, role: true, appRoleId: true },
  });
  for (const u of users) {
    if (u.appRoleId != null) continue;
    const slug = legacyAppRoleSlug(u.role);
    const ar = await prisma.appRole.findUnique({ where: { slug } });
    if (ar) {
      await prisma.user.update({
        where: { id: u.id },
        data: { appRoleId: ar.id },
      });
    }
  }
}
