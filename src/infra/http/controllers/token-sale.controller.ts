import { JWTAuthGuard } from "@/infra/auth/jwt.auth-guard";
import type { TokenPayload } from "@/infra/auth/jwt.strategy";
import { ZodValidationPipe } from "@/infra/http/pipes/zod-validation-pipe";
import { TokenSaleService } from "@/services/token-sale.service";
import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { z } from "zod";

const CreateTokenSaleItemSchema = z.object({
  fichaValue: z.number().positive(),
  quantity: z.number().int().positive(),
});

export const CreateTokenSaleSchema = z
  .object({
    buyerName: z.string().min(1).optional(),
    paymentMethod: z.enum(["CASH", "PIX", "CARD"]),
    amountReceived: z.number().positive().optional(),
    items: z.array(CreateTokenSaleItemSchema).min(1),
  })
  .superRefine((data, ctx) => {
    if (data.paymentMethod === "CASH" && data.amountReceived == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "amountReceived é obrigatório para pagamento em dinheiro",
        path: ["amountReceived"],
      });
    }
  });

export type CreateTokenSaleDto = z.infer<typeof CreateTokenSaleSchema>;

@Controller("token-sales")
export class TokenSaleController {
  constructor(private readonly tokenSaleService: TokenSaleService) {}

  @Post()
  @HttpCode(201)
  @UseGuards(JWTAuthGuard)
  async create(
    @Body(new ZodValidationPipe(CreateTokenSaleSchema)) data: CreateTokenSaleDto,
    @Req() req: { user?: TokenPayload },
  ) {
    const userId = req.user?.user_id;
    if (!userId) {
      throw new UnauthorizedException("Usuário não autenticado");
    }

    const sale = await this.tokenSaleService.createTokenSale(userId, data);

    return {
      id: sale.id,
      total: sale.total,
      changeAmount: sale.changeAmount,
      paymentMethod: sale.paymentMethod,
      createdAt: sale.createdAt,
      items: sale.items,
    };
  }
}
