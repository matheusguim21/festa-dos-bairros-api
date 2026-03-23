import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy, OnModuleInit {
  public client: PrismaClient;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }
    super({
      adapter: new PrismaPg({ connectionString }),
      log: ["warn", "error"],
    });
    this.client = this;
  }
  onModuleDestroy() {
    this.$disconnect()
  }
  onModuleInit() {
    this.$connect()
  }
}