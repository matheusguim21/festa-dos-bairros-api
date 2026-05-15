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
import { Role, type Stall } from "@/generated/prisma/client";
import { LEGACY_ROLE_SCREEN_KEYS } from "@/infra/rbac/rbac-defaults";

type ScreenRow = {
  key: string;
  pathSegment: string;
  label: string;
  sortOrder: number;
};

const userPublicInclude = {
  stall: true,
  appRole: {
    include: {
      screens: { include: { screen: true } },
    },
  },
} as const;

export type PublicUser = {
  id: number;
  name: string;
  username: string;
  role: Role;
  stall: Stall | null;
  appRoleId: number | null;
  appRole: {
    id: number;
    name: string;
    slug: string;
    isAdmin: boolean;
  } | null;
  allowedScreens: Array<{
    key: string;
    pathSegment: string;
    label: string;
    sortOrder: number;
  }>;
};

@Injectable()
export class UserService {
  constructor(private prismaService: PrismaService) {}

  async findAll(): Promise<PublicUser[]> {
    const rows = await this.prismaService.user.findMany({
      orderBy: { name: "asc" },
      include: userPublicInclude,
    });
    return Promise.all(rows.map((r) => this.toPublicUserFromRow(r)));
  }

  async findUserById(userId: number): Promise<PublicUser | null> {
    const row = await this.prismaService.user.findUnique({
      where: { id: userId },
      include: userPublicInclude,
    });
    if (!row) return null;
    return this.toPublicUserFromRow(row);
  }

  private async toPublicUserFromRow(row: {
    id: number;
    name: string;
    username: string;
    role: Role;
    appRoleId: number | null;
    stall: Stall | null;
    appRole: null | {
      id: number;
      name: string;
      slug: string;
      isAdmin: boolean;
      screens: { screen: ScreenRow }[];
    };
  }): Promise<PublicUser> {
    let screensSorted: Array<{
      key: string;
      pathSegment: string;
      label: string;
      sortOrder: number;
    }> = [];

    if (row.appRole?.screens?.length) {
      screensSorted = [...row.appRole.screens]
        .map((j) => j.screen)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((s) => ({
          key: s.key,
          pathSegment: s.pathSegment,
          label: s.label,
          sortOrder: s.sortOrder,
        }));
    } else {
      const keys = LEGACY_ROLE_SCREEN_KEYS[row.role];
      const dbScreens = await this.prismaService.managerScreen.findMany({
        where: { key: { in: keys } },
        orderBy: { sortOrder: "asc" },
      });
      const order = new Map(keys.map((k, i) => [k, i]));
      screensSorted = dbScreens
        .sort((a, b) => (order.get(a.key) ?? 0) - (order.get(b.key) ?? 0))
        .map((s) => ({
          key: s.key,
          pathSegment: s.pathSegment,
          label: s.label,
          sortOrder: s.sortOrder,
        }));
    }

    const appRoleLite = row.appRole
      ? {
          id: row.appRole.id,
          name: row.appRole.name,
          slug: row.appRole.slug,
          isAdmin: row.appRole.isAdmin,
        }
      : null;

    return {
      id: row.id,
      name: row.name,
      username: row.username,
      role: row.role,
      stall: row.stall,
      appRoleId: row.appRoleId ?? null,
      appRole: appRoleLite,
      allowedScreens: screensSorted,
    };
  }

  async userExists(username: string) {
    return await this.prismaService.user.findUnique({
      where: {
        username: username,
      },
    });
  }

  async createUser(user: CreateUserRequest & { appRoleId?: number }) {
    const userExists = await this.userExists(user.username);

    if (userExists) {
      throw new BadRequestException("Esse usuário já existe");
    }

    const hashedPassword = await hash(user.password, 8);

    const appRoleId = await this.resolveAppRoleIdForCreate(
      user.appRoleId,
      user.role ?? Role.STALL_SELLER,
    );

    const createdUser = await this.prismaService.user.create({
      data: {
        name: user.name,
        username: user.username,
        password: hashedPassword,
        role: user.role ?? Role.STALL_SELLER,
        stallId: user.stallId,
        appRoleId,
      },
    });
    return createdUser;
  }

  private async resolveAppRoleIdForCreate(
    explicitAppRoleId: number | undefined,
    role: Role,
  ): Promise<number> {
    if (explicitAppRoleId != null) {
      const ar = await this.prismaService.appRole.findUnique({
        where: { id: explicitAppRoleId },
      });
      if (!ar) throw new BadRequestException("Papel (appRole) inválido");
      return ar.id;
    }
    const byLegacy = await this.prismaService.appRole.findFirst({
      where: { mapsToRole: role },
    });
    if (byLegacy) return byLegacy.id;
    throw new BadRequestException(
      "Nenhum papel dinâmico vinculado a este perfil; rode o seed/migração RBAC",
    );
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
      userExists.password!,
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
    if (!user) {
      throw new NotFoundException("Usuário não encontrado");
    }
    if (!stall) {
      throw new NotFoundException("Barraca não encontrada");
    }
      await this.prismaService.user.update({
      data: {
        stallId: stallId,
      },
      where: { id: userId },
    });
    return this.findUserById(userId);
  }

  private async countOtherSystemAdmins(excludeUserId: number): Promise<number> {
    return this.prismaService.user.count({
      where: {
        id: { not: excludeUserId },
        OR: [{ role: Role.ADMIN }, { appRole: { isAdmin: true } }],
      },
    });
  }

  async updateUserAdmin(
    userId: number,
    dto: { role?: Role; stallId?: number | null; appRoleId?: number },
  ) {
    const existing = await this.prismaService.user.findUnique({
      where: { id: userId },
      include: { appRole: { select: { isAdmin: true, mapsToRole: true } } },
    });
    if (!existing) {
      throw new NotFoundException("Usuário não encontrado");
    }

    let nextRole = dto.role ?? existing.role;
    let nextAppRoleId = dto.appRoleId ?? existing.appRoleId;
    let nextAppRoleIsAdmin = existing.appRole?.isAdmin ?? false;

    if (dto.appRoleId !== undefined) {
      const ar = await this.prismaService.appRole.findUnique({
        where: { id: dto.appRoleId },
      });
      if (!ar) throw new BadRequestException("Papel (appRole) inválido");
      nextAppRoleId = ar.id;
      nextAppRoleIsAdmin = ar.isAdmin;
      if (ar.mapsToRole != null) {
        nextRole = ar.mapsToRole;
      }
    }

    const wasAdmin =
      existing.role === Role.ADMIN || Boolean(existing.appRole?.isAdmin);
    const willBeAdmin = nextRole === Role.ADMIN || nextAppRoleIsAdmin;

    if (wasAdmin && !willBeAdmin) {
      const others = await this.countOtherSystemAdmins(userId);
      if (others === 0) {
        throw new BadRequestException(
          "Não é possível remover o último administrador do sistema",
        );
      }
    }

    if (dto.stallId !== undefined && dto.stallId !== null) {
      const stall = await this.prismaService.stall.findUnique({
        where: { id: dto.stallId },
      });
      if (!stall) {
        throw new BadRequestException("Barraca não encontrada");
      }
    }

    const data: {
      role?: Role;
      stallId?: number | null;
      appRoleId?: number | null;
    } = {};
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.stallId !== undefined) data.stallId = dto.stallId;
    if (dto.appRoleId !== undefined) {
      data.appRoleId = dto.appRoleId;
      if (dto.role === undefined) {
        const ar = await this.prismaService.appRole.findUnique({
          where: { id: dto.appRoleId },
        });
        if (ar?.mapsToRole != null) {
          data.role = ar.mapsToRole;
        }
      }
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException("Nenhum campo para atualizar");
    }

    await this.prismaService.user.update({
      where: { id: userId },
      data,
    });

    return this.findUserById(userId);
  }
}
