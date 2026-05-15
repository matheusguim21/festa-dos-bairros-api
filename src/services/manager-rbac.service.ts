import { PrismaService } from "@/infra/database/prisma/prisma.service";
import { MANAGER_SCREEN_SEEDS } from "@/infra/rbac/rbac-defaults";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Role } from "@/generated/prisma/client";

@Injectable()
export class ManagerRbacService {
  constructor(private readonly prisma: PrismaService) {}

  async listScreens() {
    return this.prisma.managerScreen.findMany({
      orderBy: { sortOrder: "asc" },
    });
  }

  async ensureScreenKeysExist(keys: string[]) {
    const screens = await this.prisma.managerScreen.findMany({
      where: { key: { in: keys } },
      select: { key: true },
    });
    const found = new Set(screens.map((s) => s.key));
    const missing = keys.filter((k) => !found.has(k));
    if (missing.length) {
      throw new BadRequestException(`Telas inválidas: ${missing.join(", ")}`);
    }
  }

  async listAppRoles() {
    return this.prisma.appRole.findMany({
      orderBy: { name: "asc" },
      include: {
        screens: { include: { screen: true } },
        _count: { select: { users: true } },
      },
    });
  }

  async getAppRole(id: number) {
    const role = await this.prisma.appRole.findUnique({
      where: { id },
      include: {
        screens: { include: { screen: true } },
        _count: { select: { users: true } },
      },
    });
    if (!role) throw new NotFoundException("Papel não encontrado");
    return role;
  }

  async createAppRole(data: {
    name: string;
    description?: string | null;
    isAdmin?: boolean;
    mapsToRole?: Role | null;
    screenKeys: string[];
  }) {
    await this.ensureScreenKeysExist(data.screenKeys);
    const slug = this.makeUniqueSlug(data.name);
    const isAdmin = data.isAdmin ?? false;
    const created = await this.prisma.appRole.create({
      data: {
        name: data.name.trim(),
        slug,
        description: data.description?.trim() || null,
        isAdmin,
        mapsToRole: data.mapsToRole ?? null,
      },
    });
    await this.prisma.appRoleScreen.createMany({
      data: await this.screenCreateManyRows(created.id, data.screenKeys),
    });
    return this.getAppRole(created.id);
  }

  async updateAppRole(
    id: number,
    data: {
      name?: string;
      description?: string | null;
      isAdmin?: boolean;
      mapsToRole?: Role | null;
      screenKeys?: string[];
    },
  ) {
    const existing = await this.prisma.appRole.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Papel não encontrado");
    if (existing.isAdmin && data.isAdmin === false) {
      throw new ForbiddenException("Não é possível remover privilégios do papel administrador");
    }
    if (data.screenKeys) {
      await this.ensureScreenKeysExist(data.screenKeys);
    }

    await this.prisma.appRole.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.description !== undefined
          ? { description: data.description?.trim() || null }
          : {}),
        ...(data.isAdmin !== undefined ? { isAdmin: data.isAdmin } : {}),
        ...(data.mapsToRole !== undefined ? { mapsToRole: data.mapsToRole } : {}),
      },
    });

    if (data.screenKeys) {
      await this.prisma.appRoleScreen.deleteMany({ where: { appRoleId: id } });
      await this.prisma.appRoleScreen.createMany({
        data: await this.screenCreateManyRows(id, data.screenKeys),
      });
    }

    return this.getAppRole(id);
  }

  async deleteAppRole(id: number) {
    const existing = await this.prisma.appRole.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });
    if (!existing) throw new NotFoundException("Papel não encontrado");
    if (existing.isAdmin) {
      throw new ForbiddenException("Não é possível excluir o papel administrador");
    }
    if (existing.slug.startsWith("legacy-")) {
      throw new BadRequestException(
        "Papéis padrão do sistema não podem ser excluídos",
      );
    }
    if (existing._count.users > 0) {
      throw new ConflictException(
        "Existem usuários vinculados a este papel; reatribua-os antes de excluir",
      );
    }
    await this.prisma.appRole.delete({ where: { id } });
  }

  /** Garante que o catálogo em banco cobre o código (para deploy sem seed completo). */
  async syncScreenCatalogFromDefaults() {
    for (const s of MANAGER_SCREEN_SEEDS) {
      await this.prisma.managerScreen.upsert({
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
  }

  private makeUniqueSlug(name: string) {
    const base =
      name
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "papel";
    return `${base}-${Date.now().toString(36)}`;
  }

  private async screenCreateManyRows(appRoleId: number, keys: string[]) {
    const screens = await this.prisma.managerScreen.findMany({
      where: { key: { in: keys } },
    });
    const byKey = new Map(screens.map((s) => [s.key, s.id]));
    return keys.map((key) => {
      const screenId = byKey.get(key);
      if (!screenId) throw new BadRequestException(`Tela desconhecida: ${key}`);
      return { appRoleId, screenId };
    });
  }
}
