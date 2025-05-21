import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const stallsWithProducts = [
  {
    name: "Pingo D'água (BEBIDAS)",
    username: "pingodagua",
    password: "senha123",
    products: [
      { name: "Refrigerante 350 ml", price: 7.0 },
      { name: "Água mineral 500 ml", price: 2.0 },
      { name: "Guaracamp 250ml", price: 3.0 },
      { name: "Coquetel 400ml", price: 8.0 },
    ],
  },
  {
    name: "Jardim Luana (PASTEL)",
    username: "jardimluana",
    password: "senha123",
    products: [
      { name: "Camarão", price: 13.0 },
      { name: "Carne", price: 10.0 },
      { name: "Frango", price: 10.0 },
      { name: "Queijo", price: 10.0 },
      { name: "Pizza", price: 10.0 },
      { name: "Caldo de cana", price: 5.0 },
    ],
  },
  {
    name: "Brisa (HAMBURGUER) ",
    username: "brisa",
    password: "senha123",
    products: [
      { name: "Hamburguer tradicional (x-bacon)", price: 12.0 },
      { name: "Hamburguer tradicional duplo", price: 18.0 },
      { name: "Cheddar Melt artesanal", price: 25.0 },
      { name: "Pancho (pão com linguiça e queijo)", price: 12.0 },
    ],
  },
  {
    name: "Retiro (BATATA FRITA)",
    username: "retiro",
    password: "senha123",
    products: [
      { name: "Batata pequena", price: 10.0 },
      { name: "Batata grande com cheddar e calabresa", price: 20.0 },
    ],
  },
  {
    name: "Jardim Guaratiba (CALDOS)",
    username: "jardimguaratiba",
    password: "senha123",
    products: [
      { name: "Caldo de mocotó", price: 16.0 },
      { name: "Caldo de Aipim com carne seca", price: 16.0 },
      { name: "Caldo Verde", price: 14.0 },
      { name: "Canjica", price: 12.0 },
      { name: "Milho verde", price: 7.0 },
    ],
  },
  {
    name: "Pedra (JAPA)",
    username: "pedra",
    password: "senha123",
    products: [
      { name: "Hot filadélfia", price: 20.0 },
      { name: "Yakisoba frango", price: 15.0 },
      { name: "Yakisoba carne", price: 18.0 },
    ],
  },
  {
    name: "Catruz (DOCES)",
    username: "catruz",
    password: "senha123",
    products: [
      { name: "Banofe", price: 12.0 },
      { name: "Torta de chocolate", price: 12.0 },
      { name: "Torta de limão", price: 12.0 },
      { name: "Pudim", price: 8.0 },
      { name: "Bolo de cenoura", price: 8.0 },
      { name: "Bolo de aipim", price: 7.0 },
      { name: "Bolo de milho", price: 7.0 },
      { name: "Cuzcuz", price: 7.0 },
    ],
  },
  {
    name: "5 Marias (CHURRASCO)",
    username: "5marias",
    password: "senha123",
    products: [
      { name: "Carne", price: 10.0 },
      { name: "Misto", price: 9.0 },
      { name: "Frango", price: 8.0 },
      { name: "Queijo coalho", price: 10.0 },
      { name: "Salsichão", price: 7.0 },
    ],
  },
  {
    name: "Cabuís (AÇAÍ)",
    username: "cabuis",
    password: "senha123",
    products: [
      { name: "Açaí 300ml", price: 12.0 },
      { name: "Açaí 400ml", price: 14.0 },
    ],
  },
];

async function main() {
  for (const stall of stallsWithProducts) {
    const hashedPassword = await hash(stall.password, 10);

    await prisma.user.create({
      data: {
        name: stall.name,
        username: stall.username,
        password: hashedPassword,
        role: "STALL",
        stall: {
          create: {
            name: stall.name,
            products: {
              create: stall.products.map((product) => ({
                ...product,
                quantity: 10, // valor inicial de estoque
              })),
            },
          },
        },
      },
    });
  }

  console.log("Seed executado com sucesso!");
}

main()
  .catch((e) => {
    console.error("Erro ao rodar seed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
