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
    const pendingOrders = await this.getOrders(); // 🔁 reutiliza lógica
    client.emit("orders:pending", pendingOrders);
  }

  async emitOrders() {
    const orders = await this.getOrders();
    this.server.emit("orders:pending", orders);
  }

  private async getOrders() {
    return await this.prisma.order.findMany({
      where: {
        OR: [{ status: "PENDING" }, { status: "PREPARING" }],
      },
      include: {
        items: { include: { product: true } },
      },
      orderBy: { date: "asc" },
    });
  }

  @SubscribeMessage("new-order")
  handleNewOrder(@MessageBody() data: any) {
    console.log("Pedido recebido", data);
  }
}
