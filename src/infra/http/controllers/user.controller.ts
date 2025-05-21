import { UserService } from "@/services/user.service";
import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  UsePipes,
} from "@nestjs/common";
import { z } from "zod";
import { ZodValidationPipe } from "../pipes/zod-validation-pipe";

const addStallToUserSchema = z.object({
  userId: z.number().min(1),
  stallId: z.number().min(1),
});

export type AddStallToUserRequest = z.infer<typeof addStallToUserSchema>;
@Controller("/user")
export class UserController {
  constructor(private userService: UserService) {}

  @Get("/:userId")
  async getUserById(@Param("userId") userId: number) {
    try {
      const user = await this.userService.findUserById(Number(userId));
      if (!user) {
        throw new NotFoundException("Usuário não encontrado");
      }
      return user;
    } catch (error: any) {
      throw error;
    }
  }
  @UsePipes(new ZodValidationPipe(addStallToUserSchema))
  @Post("/stall")
  async addUserToStall(@Body() body: AddStallToUserRequest) {
    try {
      return await this.userService.addStallToUser(body);
    } catch (error) {
      throw error;
    }
  }
}
