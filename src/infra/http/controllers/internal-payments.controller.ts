import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
} from "@nestjs/common";
import { z } from "zod";
import { ZodValidationPipe } from "../pipes/zod-validation-pipe";
import { OrderService } from "@/services/order.service";

const PaymentConfirmedSchema = z.object({
  external_reference: z.string(),
  payment_id: z.string(),
  status: z.string(),
  status_detail: z.string().optional(),
  transaction_amount: z.number(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

type PaymentConfirmedDto = z.infer<typeof PaymentConfirmedSchema>;

@Controller("internal/payments")
export class InternalPaymentsController {
  constructor(private readonly ordersService: OrderService) {}

  @Post("confirmed")
  @HttpCode(200)
  async confirmed(
    @Body(new ZodValidationPipe(PaymentConfirmedSchema)) body: PaymentConfirmedDto,
    @Headers("x-payment-signature") signature: string | undefined,
  ) {
    return this.ordersService.confirmPaymentFromWebhook(body, signature);
  }
}
