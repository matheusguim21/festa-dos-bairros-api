// orders.controller.ts
import {
  Controller,
  Post,
  Body,
  Patch,
  Param,
  ParseIntPipe,
  UsePipes,
  Res,
} from "@nestjs/common";
import { z } from "zod";
import { ZodValidationPipe } from "../pipes/zod-validation-pipe";
import { OrderService } from "@/services/order.service";
import { Response } from "express";

export const CreateOrderItemSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().positive(),
});

export const CreateOrderSchema = z.object({
  stallId: z.number().int().positive(),
  buyerName: z.string().min(1).optional(),
  items: z.array(CreateOrderItemSchema).min(1),
});

export const UpdateOrderStatusSchema = z.object({
  status: z.enum(["PENDING", "DELIVERED", "CANCELED"]),
});

export type UpdateOrderStatusDto = z.infer<typeof UpdateOrderStatusSchema>;
// Inferência automática de tipos do DTO (opcional)
export type CreateOrderDto = z.infer<typeof CreateOrderSchema>;

@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrderService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(CreateOrderSchema))
  async create(@Body() data: CreateOrderDto, @Res() response: Response) {
    try {
      const order = await this.ordersService.createOrder(data);

      return response.status(201).send({
        message: "Pedido criado",
        orderId: order.id,
        status: order.status,
      });
    } catch (error: any) {
      console.error("Erro Order Controller Create Order: ", error);
      throw error;
    }
  }

  @Patch(":id/status")
  @UsePipes(new ZodValidationPipe(UpdateOrderStatusSchema))
  updateStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto
  ) {
    return this.ordersService.updateStatus(id, dto);
  }
}
