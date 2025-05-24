import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  SubscribeMessage,
  MessageBody,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { PrismaService } from "@/infra/database/prisma/prisma.service";
import { Injectable } from "@nestjs/common";

@WebSocketGateway({
  cors: { origin: "*" },
  namespace: "/order/preparing",
})
@Injectable()
export class OrdersGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(private readonly prisma: PrismaService) {}

  async handleConnection(client: Socket) {
    const pendingOrders = await this.prisma.order.findMany({
      where: { status: "PENDING" },
      include: {
        items: { include: { product: true } },
      },
      orderBy: { date: "desc" },
    });

    // ✅ Envia apenas para o cliente conectado
    client.emit("orders:pending", pendingOrders);
  }

  async emitPendingOrders() {
    const pendingOrders = await this.prisma.order.findMany({
      where: { status: "PENDING" },
      include: {
        items: { include: { product: true } },
      },
      orderBy: { date: "desc" },
    });

    // ✅ Envia para todos os clientes conectados
    this.server.emit("orders:pending", pendingOrders);
  }

  @SubscribeMessage("new-order")
  handleNewOrder(@MessageBody() data: any) {
    console.log("Pedido recebido", data);
  }
}
