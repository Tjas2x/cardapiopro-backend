require("dotenv").config();

const { PrismaClient, Role } = require("@prisma/client");
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const bcrypt = require("bcryptjs");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function main() {
  const email = "teste@comerciante.com";
  const password = "123456";
  const name = "Admin Comerciante";

  const existing = await prisma.user.findUnique({ where: { email } });

  let user;
  if (existing) {
    user = existing;
    console.log("ℹ️ Usuário admin já existe:", email);
  } else {
    const passwordHash = await bcrypt.hash(password, 10);

    user = await prisma.user.create({
      data: {
        email,
        password: passwordHash,
        name,
        role: Role.MERCHANT,
        active: true,
      },
    });

    console.log("✅ Usuário seed criado:", email);
  }

  let restaurant = await prisma.restaurant.findFirst({
    where: { ownerId: user.id },
  });

  if (!restaurant) {
    restaurant = await prisma.restaurant.create({
      data: {
        name: "Restaurante do Admin",
        description: "Restaurante teste para o app iFood-like",
        phone: "(11) 99999-9999",
        address: "Rua Exemplo, 123",
        isOpen: true,
        ownerId: user.id,
      },
    });

    console.log("✅ Restaurante seed criado:", restaurant.name);
  } else {
    console.log("ℹ️ Restaurante já existe:", restaurant.name);
  }

  const products = [
    {
      name: "X-Burger",
      description: "Pão, hambúrguer, queijo e molho especial",
      priceCents: 2490,
      imageUrl: null,
      active: true,
    },
    {
      name: "Pizza Calabresa",
      description: "Pizza grande com calabresa e cebola",
      priceCents: 5990,
      imageUrl: null,
      active: true,
    },
    {
      name: "Refrigerante 2L",
      description: "Coca-Cola / Guaraná (variável)",
      priceCents: 1290,
      imageUrl: null,
      active: true,
    },
  ];

  const existingProductsCount = await prisma.product.count({
    where: { restaurantId: restaurant.id },
  });

  if (existingProductsCount === 0) {
    await prisma.product.createMany({
      data: products.map((p) => ({
        ...p,
        restaurantId: restaurant.id,
      })),
    });

    console.log("✅ Produtos seed criados:", products.length);
  } else {
    console.log("ℹ️ Produtos já existem:", existingProductsCount);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
