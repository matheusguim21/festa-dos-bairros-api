import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Criação do usuário e barraca
  const user = await prisma.user.create({
    data: {
      name: "João",
      username: "joao",
      password: await hash("senha123", 8), // Lembre de usar hash na aplicação real
    },
  });

  const stall = await prisma.stall.create({
    data: {
      name: "Churrasco do João",
      userId: user.id,
    },
  });

  // Produtos à venda
  const products = await prisma.saleItem.createMany({
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

  // Vendas (valores fictícios)
  await prisma.sale.createMany({
    data: [
      {
        saleItemId: saleItems[0].id,
        quantity: 2,
        total: 10.0,
        date: new Date(),
      },
      {
        saleItemId: saleItems[1].id,
        quantity: 1,
        total: 6.0,
        date: new Date(),
      },
      {
        saleItemId: saleItems[3].id,
        quantity: 3,
        total: 12.0,
        date: new Date(),
      },
      {
        saleItemId: saleItems[4].id,
        quantity: 1,
        total: 3.5,
        date: new Date(),
      },
      {
        saleItemId: saleItems[6].id,
        quantity: 4,
        total: 12.0,
        date: new Date(),
      },
    ],
  });

  console.log("Seed concluído com sucesso ✅");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
