import { Body, Controller, HttpCode, Post, UsePipes } from "@nestjs/common";

import * as z from "zod";
import { ZodValidationPipe } from "../pipes/zod-validation-pipe";
import { AuthenticationService } from "@/services/auth.service";
import { Role } from "@/generated/prisma/client";
import { UserService } from "@/services/user.service";

const CreateUserSchema = z.object({
  name: z.string(),
  username: z.string().min(1),
  password: z.string().min(1),
  role: z
    .enum(Object.values(Role) as [Role, ...Role[]])
    .default("STALL_SELLER")
    .optional(),
  stallId: z.number().min(1).optional(),
});

const LoginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

const RefreshSchema = z.object({
  refresh_token: z.string().min(1),
});

export type LoginRequest = z.infer<typeof LoginSchema>;

export type RefreshRequest = z.infer<typeof RefreshSchema>;

export type CreateUserRequest = z.infer<typeof CreateUserSchema>;

@Controller("/auth")
export class AuthenticationController {
  constructor(
    private authenticationService: AuthenticationService,
    private readonly userService: UserService
  ) {}

  @UsePipes(new ZodValidationPipe(CreateUserSchema))
  @HttpCode(201)
  @Post("/register")
  async register(@Body() usuario: CreateUserRequest) {
    try {
      const response = await this.userService.createUser(usuario);
      return response;
    } catch (error) {
      return error;
    }
  }

  @UsePipes(new ZodValidationPipe(LoginSchema))
  @HttpCode(200)
  @Post("/login")
  async login(@Body() body: LoginRequest) {
    try {
      const response = await this.userService.authenticateUser(body);

      if (response) {
        const tokens = this.authenticationService.generateTokens({
          sub: response.username!,
          user_id: response.id,
        });

        return tokens;
      }
    } catch (error) {
      throw error;
    }
  }

  @UsePipes(new ZodValidationPipe(RefreshSchema))
  @HttpCode(200)
  @Post("/refresh")
  async refresh(@Body() body: RefreshRequest) {
    return this.authenticationService.refreshTokens(body.refresh_token);
  }
}
