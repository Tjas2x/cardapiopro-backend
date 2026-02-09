// backend/src/routes/me.js
const express = require("express");
const { authMiddleware } = require("../middlewares/authMiddleware");
const { prisma } = require("../lib/prisma");

const router = express.Router();

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// =========================================================
// GET /me — VERSÃO FINAL (CORRETA) PARA ASSINATURA
// =========================================================
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    // 1) BUSCA USUÁRIO
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

    if (!user) {
      return res.status(401).json({ error: "Usuário não encontrado" });
    }

    // 2) BUSCA RESTAURANTE DO DONO
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

    // 3) BUSCA ASSINATURA MAIS RECENTE
    let subscription = await prisma.subscription.findFirst({
      where: { restaurantId: restaurant.id },
      orderBy: { createdAt: "desc" },
      select: {
        status: true,
        trialEndsAt: true,
        paidUntil: true,
        planType: true,        // <-- Mensal/Anual
        currentPeriodEnd: true // <-- se existir no schema
      },
    });

    // 4) AUTO-CRIA TRIAL 7 DIAS SE NÃO EXISTIR (bases antigas)
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

      subscription = await prisma.subscription.findFirst({
        where: { restaurantId: restaurant.id },
        orderBy: { createdAt: "desc" },
        select: {
          status: true,
          trialEndsAt: true,
          paidUntil: true,
          planType: true,
          currentPeriodEnd: true,
        },
      });
    }

    // =====================================================
    // 5) NORMALIZAÇÃO FINAL PARA O APP (ESSENCIAL)
    // =====================================================

    const normalizedSubscription = {
      status: subscription.status,

      // TRIAL usa trialEndsAt
      trialEndsAt:
        subscription.status === "TRIAL"
          ? subscription.trialEndsAt
          : null,

      // Tipo de plano (garantia para o app)
      planType:
        subscription.planType ??
        (subscription.status === "ACTIVE" ? "MONTHLY" : null),

      // Data de fim do período pago:
      // Prioridade:
      // 1) currentPeriodEnd (se existir no schema)
      // 2) paidUntil (se você já usa para validação em pedidos)
      currentPeriodEnd:
        subscription.currentPeriodEnd ??
        subscription.paidUntil ??
        null,
    };

    // =====================================================
    // 6) RETORNO FINAL (CONTRATO CORRETO PARA O APP)
    // =====================================================
    return res.json({
      user,
      restaurant: {
        ...restaurant,
        subscription: normalizedSubscription,
      },
    });
  } catch (err) {
    console.error("ERRO /me:", err);
    return res.status(500).json({ error: "Erro ao carregar /me" });
  }
});

module.exports = router;
