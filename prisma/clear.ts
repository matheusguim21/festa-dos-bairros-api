import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  // Ordem correta de exclusão respeitando as FKs
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();

  await prisma.stockOut.deleteMany();
  await prisma.stockIn.deleteMany();

  await prisma.product.deleteMany();

  await prisma.tokenSale.deleteMany();
  await prisma.cashier.deleteMany();

  await prisma.stall.deleteMany();
  await prisma.user.deleteMany();

  console.log("🧹 Todas as tabelas foram limpas com sucesso.");
}

main()
  .catch((e) => {
    console.error("Erro ao limpar o banco:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
