import { JWTAuthGuard } from "@/infra/auth/jwt.auth-guard";
import type { TokenPayload } from "@/infra/auth/jwt.strategy";
import { assertDashboardAccess } from "@/infra/auth/resolve-dashboard-access";
import { DashboardService } from "@/services/dashboard.service";
import { UserService } from "@/services/user.service";
import {
  Controller,
  DefaultValuePipe,
  Get,
  NotFoundException,
  ParseIntPipe,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";

@Controller("dashboard")
@UseGuards(JWTAuthGuard)
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly userService: UserService,
  ) {}

  private async assertAccess(userId: number): Promise<void> {
    const user = await this.userService.findUserById(userId);
    if (!user) {
      throw new NotFoundException("Usuário não encontrado");
    }
    assertDashboardAccess(user);
  }

  @Get("summary")
  async getSummary(
    @Req() req: { user?: TokenPayload },
    @Query("date") date?: string,
  ) {
    const userId = req.user?.user_id;
    if (!userId) {
      throw new UnauthorizedException("Usuário não autenticado");
    }
    await this.assertAccess(userId);
    return this.dashboardService.getSummary(date);
  }

  @Get("top-products")
  async getTopProducts(
    @Req() req: { user?: TokenPayload },
    @Query("date") date?: string,
    @Query("limit", new DefaultValuePipe(5), ParseIntPipe) limit?: number,
  ) {
    const userId = req.user?.user_id;
    if (!userId) {
      throw new UnauthorizedException("Usuário não autenticado");
    }
    await this.assertAccess(userId);
    return this.dashboardService.getTopProducts(date, limit);
  }

  @Get("token-sales")
  async getTokenSales(
    @Req() req: { user?: TokenPayload },
    @Query("date") date?: string,
  ) {
    const userId = req.user?.user_id;
    if (!userId) {
      throw new UnauthorizedException("Usuário não autenticado");
    }
    await this.assertAccess(userId);
    return this.dashboardService.getTokenSales(date);
  }
}
