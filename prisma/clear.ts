import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Ordem de exclusão respeitando as FKs
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();

  await prisma.stockOut.deleteMany();
  await prisma.stockIn.deleteMany();

  await prisma.tokenSale.deleteMany();
  await prisma.cashier.deleteMany();

  await prisma.stall.deleteMany();
  await prisma.user.deleteMany();

  console.log("🧹 Todas as tabelas foram limpas com sucesso.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
