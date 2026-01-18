const { prisma } = require("../src/lib/prisma");

async function main() {
  const updated = await prisma.restaurant.updateMany({
    data: {
      name: "CardapioPro",
      description: "Cardápio online",
    },
  });

  console.log("✅ Restaurantes atualizados:", updated.count);
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e);
    process.exit(1);
  })
  .finally(async () => {
    prisma.$disconnect();
  });
