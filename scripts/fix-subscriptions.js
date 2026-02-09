const { prisma } = require("../src/lib/prisma");

async function fixSubscriptions() {
  console.log("🔧 Corrigindo assinaturas existentes...");

  const subs = await prisma.subscription.findMany();

  for (const sub of subs) {
    let planType = sub.planType;
    let currentPeriodEnd = sub.currentPeriodEnd;

    // 🔹 Se já é ACTIVE e não tem plano, assumimos MONTHLY por padrão
    if (sub.status === "ACTIVE" && !planType) {
      planType = "monthly";
    }

    // 🔹 Se não tem currentPeriodEnd mas tem paidUntil, usamos ele
    if (!currentPeriodEnd && sub.paidUntil) {
      currentPeriodEnd = sub.paidUntil;
    }

    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        planType,
        currentPeriodEnd,
      },
    });

    console.log(`✅ Subscription ${sub.id} corrigida`);
  }

  console.log("🎯 Correção finalizada!");
  process.exit(0);
}

fixSubscriptions();
