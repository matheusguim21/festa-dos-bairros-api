import { Body, Controller, HttpCode, Post, UsePipes } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

import * as z from "zod";
import { ZodValidationPipe } from "../pipes/zod-validation-pipe";
import { AuthenticationService } from "@/services/auth.service";

const CreateUserSchema = z.object({
  name: z.string(),
  username: z.string().min(1),
  password: z.string().min(1),
  role: z.enum(["ADMIN", "STALL"]).default("STALL").optional(),
});

const LoginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export type LoginRequest = z.infer<typeof LoginSchema>;

export type CreateUserRequest = z.infer<typeof CreateUserSchema>;

@Controller("/auth")
export class AuthenticationController {
  constructor(private authenticationService: AuthenticationService) {}

  @UsePipes(new ZodValidationPipe(CreateUserSchema))
  @HttpCode(201)
  @Post("/register")
  async register(@Body() usuario: CreateUserRequest) {
    try {
      const response = await this.authenticationService.register(usuario);
      return response;
    } catch (error) {
      return error;
    }
  }

  @UsePipes(new ZodValidationPipe(LoginSchema))
  @HttpCode(200)
  @Post("/login")
  async login(@Body() body: LoginRequest) {
    console.log("body: ", body);
    try {
      const response = await this.authenticationService.authenticateUser(body);

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
}
