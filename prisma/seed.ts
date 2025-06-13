// prisma/seed.ts
import { PrismaClient, Role } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

type StallConfig = {
  name: string;
  username: string;
  password: string;
  role?: Role;
  products?: Array<{ name: string; price: number; quantity: number }>;
};

const stallsWithProducts: StallConfig[] = [
  // contas globais
  {
    name: "Matheus",
    username: "matheus",
    password: "admin2025",
    role: Role.ADMIN,
  },
  {
    name: "Andreia",
    username: "andreia",
    password: "admin2025",
    role: Role.ADMIN,
  },
  {
    name: "Márcia",
    username: "marcia",
    password: "admin2025",
    role: Role.ADMIN,
  },
  {
    name: "Pr. Marcelo",
    username: "pastor",
    password: "admin2025",
    role: Role.ADMIN,
  },

  // barracas com produtos e quantidades atualizadas
  {
    name: "Retiro (BATATA FRITA)",
    username: "retiro",
    password: "senha123",
    products: [
      {
        name: "Batata grande com cheddar e calabresa",
        price: 20.0,
        quantity: 60,
      },
      { name: "Batata pequena", price: 10.0, quantity: 120 },
    ],
  },
  {
    name: "5 Marias (CHURRASCO)",
    username: "5marias",
    password: "senha123",
    products: [
      { name: "Carne", price: 10.0, quantity: 148 },
      { name: "Misto", price: 9.0, quantity: 98 },
      { name: "Frango", price: 8.0, quantity: 96 },
      { name: "Salsichão", price: 7.0, quantity: 70 },
      { name: "Queijo coalho", price: 10.0, quantity: 20 },
    ],
  },
  {
    name: "Pedra (JAPA)",
    username: "pedra",
    password: "senha123",
    products: [
      { name: "Hot filadélfia", price: 20.0, quantity: 400 },
      { name: "Yakisoba carne", price: 18.0, quantity: 46 },
      { name: "Yakisoba frango", price: 15.0, quantity: 50 },
    ],
  },
  {
    name: "Brisa (HAMBURGUER)",
    username: "brisa",
    password: "senha123",
    products: [
      { name: "Pancho (pão com linguiça e queijo)", price: 12.0, quantity: 40 },
      { name: "Cheddar Melt artesanal", price: 25.0, quantity: 47 },
      { name: "Hamburguer tradicional (x-bacon)", price: 12.0, quantity: 40 },
      { name: "Hamburguer tradicional duplo", price: 18.0, quantity: 10 },
    ],
  },
  {
    name: "Catruz (DOCES)",
    username: "catruz",
    password: "senha123",
    products: [
      { name: "Torta de limão", price: 12.0, quantity: 50 },
      { name: "Bolo de cenoura", price: 8.0, quantity: 50 },
      { name: "Bolo de aipim", price: 7.0, quantity: 20 },
      { name: "Banofe", price: 12.0, quantity: 110 },
      { name: "Torta de chocolate", price: 12.0, quantity: 30 },
      { name: "Cuzcuz", price: 7.0, quantity: 50 },
      { name: "Bolo de milho", price: 7.0, quantity: 30 },
      // Pudim não foi citado, fica com estoque default 10:
      { name: "Pudim", price: 8.0, quantity: 10 },
    ],
  },
  {
    name: "Jardim Luana (PASTEL)",
    username: "jardimluana",
    password: "senha123",
    products: [
      { name: "Camarão", price: 13.0, quantity: 50 },
      { name: "Carne", price: 10.0, quantity: 50 },
      { name: "Queijo", price: 10.0, quantity: 50 },
      { name: "Pizza", price: 10.0, quantity: 20 },
      { name: "Frango", price: 10.0, quantity: 30 },
    ],
  },
  {
    name: "Jardim Guaratiba (CALDOS)",
    username: "jardimguaratiba",
    password: "senha123",
    products: [
      { name: "Caldo de Aipim com carne seca", price: 16.0, quantity: 30 },
      { name: "Caldo de mocotó", price: 16.0, quantity: 30 },
      { name: "Caldo Verde", price: 14.0, quantity: 30 },
      { name: "Canjica", price: 12.0, quantity: 30 },
      { name: "Milho verde", price: 7.0, quantity: 80 },
    ],
  },
  {
    name: "Pingo D'água (BEBIDAS)",
    username: "pingodagua",
    password: "senha123",
    products: [
      { name: "Guaracamp 250ml", price: 3.0, quantity: 240 },
      { name: "Refrigerante 350 ml", price: 7.0, quantity: 120 },
      { name: "Coquetel 400ml", price: 8.0, quantity: 60 },
      { name: "Água mineral 500 ml", price: 2.0, quantity: 36 },
      // novos itens de bebida
      { name: "Café", price: 5.0, quantity: 50 },
      { name: "Chocolate quente", price: 6.0, quantity: 50 },
    ],
  },
  {
    name: "Cabuís (AÇAÍ)",
    username: "cabuis",
    password: "senha123",
    products: [
      { name: "Açaí 300ml", price: 12.0, quantity: 40 },
      { name: "Açaí 400ml", price: 14.0, quantity: 30 },
    ],
  },
];

async function main() {
  for (const stall of stallsWithProducts) {
    const hashedPassword = await hash(stall.password, 10);

    // contas de administrador global
    if (!stall.products) {
      await prisma.user.create({
        data: {
          name: stall.name,
          username: stall.username,
          password: hashedPassword,
          role: stall.role!,
        },
      });
      continue;
    }

    // contas STALL_ADMIN com criação da barraca + produtos
    const createdUser = await prisma.user.create({
      data: {
        name: stall.name,
        username: stall.username,
        password: hashedPassword,
        role: Role.STALL_ADMIN,
        stall: {
          create: {
            name: stall.name,
            products: {
              create: stall.products.map((p) => ({
                name: p.name,
                price: p.price,
                quantity: p.quantity,
              })),
            },
          },
        },
      },
      include: { stall: true },
    });

    // conta adicional para cada barraca
    await prisma.user.create({
      data: {
        name: `${stall.name} Admin`,
        username: `${stall.username}_admin`,
        password: hashedPassword,
        role: Role.STALL_ADMIN,
        stall: {
          connect: { id: createdUser.stall!.id },
        },
      },
    });
  }

  console.log("🌱 Seed executado com sucesso!");
}

main()
  .catch((e) => {
    console.error("Erro ao rodar seed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
