import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Criação do usuário e barraca
  const user = await prisma.user.create({
    data: {
      name: "João",
      username: "joao",
      password: await hash("senha123", 8),
      role: "STALL",
    },
  });

  const stall = await prisma.stall.create({
    data: {
      name: "Churrasco do João",
      userId: user.id,
    },
  });

  // Produtos à venda
  await prisma.saleItem.createMany({
    data: [
      { name: "Espetinho de Frango", price: 5.0, stallId: stall.id },
      { name: "Espetinho de Carne", price: 6.0, stallId: stall.id },
      { name: "Espetinho de Queijo", price: 4.5, stallId: stall.id },
      { name: "Coca-Cola Lata", price: 4.0, stallId: stall.id },
      { name: "Guaraná Lata", price: 3.5, stallId: stall.id },
      { name: "Água", price: 2.0, stallId: stall.id },
      { name: "Pão de Alho", price: 3.0, stallId: stall.id },
      { name: "Churrasquinho de Linguiça", price: 5.5, stallId: stall.id },
      { name: "Refrigerante 600ml", price: 5.0, stallId: stall.id },
      { name: "Farofa Extra", price: 1.5, stallId: stall.id },
    ],
  });

  const saleItems = await prisma.saleItem.findMany({
    where: { stallId: stall.id },
  });

  // Vendas
  await prisma.sale.createMany({
    data: [
      { saleItemId: saleItems[0].id, quantity: 2, total: 10.0 },
      { saleItemId: saleItems[1].id, quantity: 1, total: 6.0 },
      { saleItemId: saleItems[3].id, quantity: 3, total: 12.0 },
      { saleItemId: saleItems[4].id, quantity: 1, total: 3.5 },
      { saleItemId: saleItems[6].id, quantity: 4, total: 12.0 },
    ],
  });

  // Itens de estoque
  await prisma.stockItem.createMany({
    data: [
      { name: "Carne Bovina (kg)", quantity: 20 },
      { name: "Frango (kg)", quantity: 15 },
      { name: "Queijo Coalho (pacotes)", quantity: 10 },
      { name: "Pão de Alho (unid)", quantity: 30 },
      { name: "Coca-Cola Lata", quantity: 50 },
      { name: "Guaraná Lata", quantity: 40 },
      { name: "Refrigerante 600ml", quantity: 25 },
      { name: "Farinha (kg)", quantity: 5 },
      { name: "Carvão (sacos)", quantity: 10 },
      { name: "Água Mineral (garrafas)", quantity: 60 },
    ],
  });

  console.log("Seed com produtos, vendas e estoque concluído com sucesso ✅");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
