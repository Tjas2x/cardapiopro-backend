const express = require("express");
const { authMiddleware } = require("../middlewares/authMiddleware");
const { prisma } = require("../lib/prisma");

const router = express.Router();

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// GET /me
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: "Não autenticado" });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
      },
    });

    if (!user) return res.status(401).json({ error: "Usuário não encontrado" });

    const restaurant = await prisma.restaurant.findFirst({
      where: { ownerId: userId },
      select: {
        id: true,
        name: true,
        description: true,
        phone: true,
        address: true,
        isOpen: true,
      },
    });

    if (!restaurant) {
      return res.json({ user, restaurant: null });
    }

    // ✅ busca subscription
    let subscription = await prisma.subscription.findUnique({
      where: { restaurantId: restaurant.id },
      select: {
        status: true,
        trialEndsAt: true,
        paidUntil: true,
      },
    });

    // ✅ AUTO-FIX: se não existir, cria TRIAL 7 dias (para bases antigas)
    if (!subscription) {
      const now = new Date();
      const trialEndsAt = addDays(now, 7);

      await prisma.subscription.create({
        data: {
          restaurantId: restaurant.id,
          status: "TRIAL",
          trialEndsAt,
        },
      });

      subscription = await prisma.subscription.findUnique({
        where: { restaurantId: restaurant.id },
        select: {
          status: true,
          trialEndsAt: true,
          paidUntil: true,
        },
      });
    }

    return res.json({
      user,
      restaurant: {
        ...restaurant,
        subscription,
      },
    });
  } catch (err) {
    console.error("ERRO /me:", err);
    return res.status(500).json({ error: "Erro ao carregar /me" });
  }
});

module.exports = router;
