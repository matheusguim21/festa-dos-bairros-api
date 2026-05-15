import { UserService } from "@/services/user.service";
import { JWTAuthGuard } from "@/infra/auth/jwt.auth-guard";
import { AdminGuard } from "@/infra/auth/admin.guard";
import { AdminOrSelfGuard } from "@/infra/auth/admin-or-self.guard";
import type { TokenPayload } from "@/infra/auth/jwt.strategy";
import { Role } from "@/generated/prisma/client";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import { z } from "zod";
import { ZodValidationPipe } from "../pipes/zod-validation-pipe";

const addStallToUserSchema = z.object({
  userId: z.number().min(1),
  stallId: z.number().min(1),
});

const adminCreateUserSchema = z.object({
  name: z.string(),
  username: z.string().min(1),
  password: z.string().min(1),
  role: z
    .enum(Object.values(Role) as [Role, ...Role[]])
    .default(Role.STALL_SELLER)
    .optional(),
  stallId: z.number().min(1).optional(),
  appRoleId: z.number().int().min(1).optional(),
});

const updateUserAdminSchema = z
  .object({
    role: z.enum(Object.values(Role) as [Role, ...Role[]]).optional(),
    stallId: z.union([z.number().int().min(1), z.null()]).optional(),
    appRoleId: z.number().int().min(1).optional(),
  })
  .strict()
  .refine(
    (d) =>
      d.role !== undefined || d.stallId !== undefined || d.appRoleId !== undefined,
    {
      message: "Informe role, stallId e/ou appRoleId",
    },
  );

export type AddStallToUserRequest = z.infer<typeof addStallToUserSchema>;
export type AdminCreateUserRequest = z.infer<typeof adminCreateUserSchema>;
export type UpdateUserAdminRequest = z.infer<typeof updateUserAdminSchema>;

const passwordPolicySchema = z.string().regex(
  /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/,
  {
    message: "Senha: mínimo 8 caracteres, com letra e número",
  },
);

const resetUserPasswordSchema = z.object({
  password: passwordPolicySchema,
});

export type ResetUserPasswordRequest = z.infer<typeof resetUserPasswordSchema>;

@Controller("/users")
export class UserController {
  constructor(private userService: UserService) {}

  @Get()
  @UseGuards(JWTAuthGuard, AdminGuard)
  async getAll() {
    return this.userService.findAll();
  }

  @Post()
  @HttpCode(201)
  @UseGuards(JWTAuthGuard, AdminGuard)
  @UsePipes(new ZodValidationPipe(adminCreateUserSchema))
  async createUser(@Body() body: AdminCreateUserRequest) {
    const created = await this.userService.createUser(body);
    const safe = await this.userService.findUserById(created.id);
    if (!safe) {
      throw new NotFoundException("Usuário não encontrado");
    }
    return safe;
  }

  @Post("stall")
  @UseGuards(JWTAuthGuard, AdminGuard)
  @UsePipes(new ZodValidationPipe(addStallToUserSchema))
  async addUserToStall(@Body() body: AddStallToUserRequest) {
    return this.userService.addStallToUser(body);
  }

  @Get(":userId")
  @UseGuards(JWTAuthGuard, AdminOrSelfGuard)
  async getUserById(@Param("userId", ParseIntPipe) userId: number) {
    const user = await this.userService.findUserById(userId);
    if (!user) {
      throw new NotFoundException("Usuário não encontrado");
    }
    return user;
  }

  @Patch(":userId/password")
  @HttpCode(204)
  @UseGuards(JWTAuthGuard, AdminGuard)
  async resetPassword(
    @Param("userId", ParseIntPipe) userId: number,
    @Body(new ZodValidationPipe(resetUserPasswordSchema))
    body: ResetUserPasswordRequest,
  ) {
    await this.userService.resetUserPassword(userId, body.password);
  }

  @Patch(":userId")
  @UseGuards(JWTAuthGuard, AdminGuard)
  async updateUser(
    @Param("userId", ParseIntPipe) userId: number,
    @Body(new ZodValidationPipe(updateUserAdminSchema))
    body: UpdateUserAdminRequest,
  ) {
    return this.userService.updateUserAdmin(userId, body);
  }

  @Delete(":userId")
  @HttpCode(204)
  @UseGuards(JWTAuthGuard, AdminGuard)
  async deleteUser(
    @Param("userId", ParseIntPipe) userId: number,
    @Req() req: { user?: TokenPayload },
  ) {
    const actingUserId = req.user?.user_id;
    if (actingUserId == null) {
      throw new NotFoundException("Usuário não autenticado");
    }
    await this.userService.deleteUserAdmin(userId, actingUserId);
  }
}
