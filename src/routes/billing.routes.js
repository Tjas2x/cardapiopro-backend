const express = require("express");
const router = express.Router();

const { authMiddleware } = require("../middlewares/authMiddleware");
const { prisma } = require("../lib/prisma");

const PHONE = "5595991143280";

function buildWhatsAppUrl(phone, message) {
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${phone}?text=${encoded}`;
}

/**
 * GET /billing/whatsapp?plan=monthly|yearly
 */
router.get("/whatsapp", async (req, res) => {
  try {
    const plan = String(req.query.plan || "").toLowerCase();

    let message = "Olá! Quero assinar o CardapioPro.";

    if (plan === "monthly") {
      message =
        "Olá! Quero assinar o CardapioPro no plano Mensal (R$ 29,90/mês).";
    } else if (plan === "yearly") {
      message =
        "Olá! Quero assinar o CardapioPro no plano Anual (R$ 299,90/ano).";
    }

    const planObj =
      plan === "monthly"
        ? { id: "monthly", priceCents: 2990 }
        : plan === "yearly"
        ? { id: "yearly", priceCents: 29990 }
        : null;

    return res.json({
      phone: PHONE,
      message,
      whatsappUrl: buildWhatsAppUrl(PHONE, message),
      plan: planObj,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao gerar WhatsApp" });
  }
});

/**
 * POST /billing/activate
 * body: { code: "MENSAL29" | "ANUAL299" }
 */
router.post("/activate", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: "Não autenticado" });

    const code = String(req.body?.code || "")
      .trim()
      .toUpperCase();

    if (!code) return res.status(400).json({ error: "Código é obrigatório" });

    // ✅ CÓDIGOS MVP (depois a gente faz geração e banco)
    const MONTHLY_CODE = "MENSAL29";
    const YEARLY_CODE = "ANUAL299";

    let daysToAdd = 0;

    if (code === MONTHLY_CODE) daysToAdd = 30;
    else if (code === YEARLY_CODE) daysToAdd = 365;
    else return res.status(400).json({ error: "Código inválido" });

    const restaurant = await prisma.restaurant.findFirst({
      where: { ownerId: userId },
      include: { subscription: true },
    });

    if (!restaurant) {
      return res.status(400).json({ error: "Sem restaurante cadastrado" });
    }

    const now = new Date();
    const paidUntil = new Date(now);
    paidUntil.setDate(paidUntil.getDate() + daysToAdd);

    if (!restaurant.subscription) {
      await prisma.subscription.create({
        data: {
          restaurantId: restaurant.id,
          status: "ACTIVE",
          paidUntil,
        },
      });
    } else {
      await prisma.subscription.update({
        where: { id: restaurant.subscription.id },
        data: {
          status: "ACTIVE",
          paidUntil,
          trialEndsAt: null,
        },
      });
    }

    return res.json({
      ok: true,
      status: "ACTIVE",
      paidUntil,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao ativar assinatura" });
  }
});

module.exports = router;
