import { UserService } from "@/services/user.service";
import { Controller, Get, Param } from "@nestjs/common";

@Controller("/user")
export class UserController {
  constructor(private userService: UserService) {}

  @Get("/:userId")
  async getUserById(@Param("userId") userId: number) {
    try {
      return await this.userService.findUserById(Number(userId));
    } catch (error: any) {
      throw error;
    }
  }
}
