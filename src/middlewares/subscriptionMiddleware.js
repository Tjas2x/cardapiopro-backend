const { prisma } = require("../lib/prisma");

function isActiveSubscription(sub) {
  if (!sub) return false;

  const now = new Date();

  if (sub.status === "CANCELED") return false;
  if (sub.status === "EXPIRED") return false;

  if (sub.status === "TRIAL") {
    if (!sub.trialEndsAt) return false;
    return now <= new Date(sub.trialEndsAt);
  }

  if (sub.status === "ACTIVE") {
    if (!sub.paidUntil) return false;
    return now <= new Date(sub.paidUntil);
  }

  return false;
}

async function requireActiveSubscription(req, res, next) {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: "Não autenticado" });

    const restaurant = await prisma.restaurant.findFirst({
      where: { ownerId: userId },
      include: { subscription: true },
    });

    if (!restaurant) {
      return res.status(400).json({
        error: "Sem restaurante cadastrado",
        code: "NO_RESTAURANT",
      });
    }

    let sub = restaurant.subscription;

    if (!sub) {
      return res.status(402).json({
        error: "Assinatura não encontrada",
        code: "SUBSCRIPTION_REQUIRED",
      });
    }

    const ok = isActiveSubscription(sub);

    if (!ok) {
      // Se já estiver cancelado/expired, só devolve
      if (sub.status !== "EXPIRED" && sub.status !== "CANCELED") {
        sub = await prisma.subscription.update({
          where: { id: sub.id },
          data: { status: "EXPIRED" },
        });
      }

      return res.status(402).json({
        error: "Assinatura expirada. Ative para continuar.",
        code: "SUBSCRIPTION_EXPIRED",
        subscription: {
          status: sub.status,
          trialEndsAt: sub.trialEndsAt,
          paidUntil: sub.paidUntil,
        },
      });
    }

    req.restaurantId = restaurant.id;
    req.subscription = sub;

    return next();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao validar assinatura" });
  }
}

module.exports = { requireActiveSubscription };
