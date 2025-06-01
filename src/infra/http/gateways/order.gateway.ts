import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { PrismaService } from "@/infra/database/prisma/prisma.service";
import { Injectable, Logger } from "@nestjs/common";

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
    // 1. Extrai o stallId do handshake (query ou auth)
    const rawStallId = client.handshake.query.stallId as string | undefined;
    if (!rawStallId) {
      client.disconnect(true);
      return;
    }
    const stallId = Number(rawStallId);
    if (isNaN(stallId)) {
      client.disconnect(true);
      return;
    }

    // 2. Faz o cliente “entrar” numa room específica para este stallId
    client.data.stallId = stallId;
    client.join(`stall-${stallId}`);

    // 3. Envia o estado inicial só para este cliente
    const pendingOrders = await this.getOrders(stallId);
    client.emit("orders:pending", pendingOrders);
  }

  private async getOrders(stallId: number) {
    return this.prisma.order.findMany({
      where: {
        stallId,
        OR: [{ status: "PENDING" }, { status: "PREPARING" }],
      },
      include: { items: { include: { product: true } } },
      orderBy: { date: "asc" },
    });
  }

  /**
   * Esse método deve emitir apenas para a room “stall-X”
   * garantindo que só quem estiver conectado naquela room receba a atualização.
   */
  async emitOrdersToStall(stallId: number) {
    const orders = await this.getOrders(stallId);
    this.server.to(`stall-${stallId}`).emit("orders:pending", orders);
  }

  @SubscribeMessage("new-order")
  handleNewOrder(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    // Aqui você pode, por exemplo, processar o pedido e depois chamar emitOrdersToStall(...)
    const stallId = client.data.stallId as number;
    console.log("Pedido recebido para stall:", stallId, data);
    // … criar no banco etc …
    // this.emitOrdersToStall(stallId);
  }
}
