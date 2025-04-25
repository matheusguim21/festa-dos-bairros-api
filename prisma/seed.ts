import { PrismaClient, Role } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Usuários e barracas
  const usersData = [
    {
      name: "João",
      username: "joao",
      password: await hash("senha123", 8),
      role: "STALL",
      stall: {
        name: "Churrasco do João",
      },
    },
    {
      name: "Maria",
      username: "maria",
      password: await hash("senha123", 8),
      role: "STALL",
      stall: {
        name: "Doces da Maria",
      },
    },
    {
      name: "Pedro",
      username: "pedro",
      password: await hash("senha123", 8),
      role: "STALL",
      stall: {
        name: "Hamburgueria do Pedro",
      },
    },
  ];

  for (const userData of usersData) {
    const user = await prisma.user.create({
      data: {
        name: userData.name,
        username: userData.username,
        password: userData.password,
        role: userData.role as Role,
      },
    });

    const stall = await prisma.stall.create({
      data: {
        name: userData.stall.name,
        userId: user.id,
      },
    });

    // Adiciona produtos por barraca
    const productsByStall = {
      "Churrasco do João": [
        { name: "Espetinho de Frango", price: 5.0 },
        { name: "Espetinho de Carne", price: 6.0 },
        { name: "Pão de Alho", price: 3.0 },
        { name: "Farofa Extra", price: 1.5 },
      ],
      "Doces da Maria": [
        { name: "Brigadeiro", price: 2.0 },
        { name: "Beijinho", price: 2.0 },
        { name: "Bolo de Pote", price: 6.0 },
      ],
      "Hamburgueria do Pedro": [
        { name: "Hamburguer Simples", price: 10.0 },
        { name: "Hamburguer Duplo", price: 15.0 },
        { name: "Batata Frita", price: 7.0 },
      ],
    };

    await prisma.product.createMany({
      data: productsByStall[stall.name].map((p) => ({
        ...p,
        stallId: stall.id,
      })),
    });

    const createdProducts = await prisma.product.findMany({
      where: { stallId: stall.id },
    });

    // Vendas simuladas
    await prisma.sale.createMany({
      data: createdProducts.slice(0, 3).map((product, i) => ({
        productId: product.id,
        quantity: i + 1,
        total: (i + 1) * product.price,
      })),
    });
  }

  // Itens de estoque com unidade
  await prisma.stockItem.createMany({
    data: [
      { name: "Carne Bovina", quantity: 20, unit: "kg" },
      { name: "Frango", quantity: 15, unit: "kg" },
      { name: "Queijo Coalho", quantity: 10, unit: "pacote" },
      { name: "Pão de Alho", quantity: 30, unit: "unidade" },
      { name: "Coca-Cola Lata", quantity: 50, unit: "unidade" },
      { name: "Guaraná Lata", quantity: 40, unit: "unidade" },
      { name: "Refrigerante 600ml", quantity: 25, unit: "garrafa" },
      { name: "Farinha", quantity: 5, unit: "kg" },
      { name: "Carvão", quantity: 10, unit: "saco" },
      { name: "Água Mineral", quantity: 60, unit: "garrafa" },
    ],
  });

  console.log("Seed com múltiplas barracas e estoque populado ✅");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
