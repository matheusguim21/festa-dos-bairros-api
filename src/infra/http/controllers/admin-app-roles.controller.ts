import { JWTAuthGuard } from "@/infra/auth/jwt.auth-guard";
import { AdminGuard } from "@/infra/auth/admin.guard";
import { ManagerRbacService } from "@/services/manager-rbac.service";
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import { z } from "zod";
import { ZodValidationPipe } from "../pipes/zod-validation-pipe";
import { Role } from "@/generated/prisma/client";

const createAppRoleSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).nullable().optional(),
  isAdmin: z.boolean().optional(),
  mapsToRole: z
    .enum(Object.values(Role) as [Role, ...Role[]])
    .nullable()
    .optional(),
  screenKeys: z.array(z.string().min(1)).min(1),
});

const updateAppRoleSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    description: z.string().max(500).nullable().optional(),
    isAdmin: z.boolean().optional(),
    mapsToRole: z
      .enum(Object.values(Role) as [Role, ...Role[]])
      .nullable()
      .optional(),
    screenKeys: z.array(z.string().min(1)).min(1).optional(),
  })
  .strict()
  .refine(
    (d) =>
      d.name !== undefined ||
      d.description !== undefined ||
      d.isAdmin !== undefined ||
      d.mapsToRole !== undefined ||
      d.screenKeys !== undefined,
    { message: "Nada para atualizar" },
  );

export type CreateAppRoleBody = z.infer<typeof createAppRoleSchema>;
export type UpdateAppRoleBody = z.infer<typeof updateAppRoleSchema>;

@Controller("/admin/app-roles")
@UseGuards(JWTAuthGuard, AdminGuard)
export class AdminAppRolesController {
  constructor(private readonly rbac: ManagerRbacService) {}

  @Get()
  list() {
    return this.rbac.listAppRoles();
  }

  @Post()
  @UsePipes(new ZodValidationPipe(createAppRoleSchema))
  create(@Body() body: CreateAppRoleBody) {
    return this.rbac.createAppRole(body);
  }

  @Get(":id")
  getOne(@Param("id", ParseIntPipe) id: number) {
    return this.rbac.getAppRole(id);
  }

  @Patch(":id")
  @UsePipes(new ZodValidationPipe(updateAppRoleSchema))
  update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateAppRoleBody) {
    return this.rbac.updateAppRole(id, body);
  }

  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.rbac.deleteAppRole(id);
  }
}
