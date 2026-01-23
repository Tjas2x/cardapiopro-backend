const express = require("express");
const router = express.Router();

const { authMiddleware } = require("../middlewares/authMiddleware");
const { prisma } = require("../lib/prisma");

const PHONE = "5595991143280";

/**
 * ADMIN SECRET (defina no Render)
 * Ex: ADMIN_SECRET=uma_senha_forte
 */
const ADMIN_SECRET = process.env.ADMIN_SECRET || "";

function buildWhatsAppUrl(phone, message) {
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${phone}?text=${encoded}`;
}

function requireAdminSecret(req, res, next) {
  const secret = String(req.headers["x-admin-secret"] || "");
  if (!ADMIN_SECRET || secret !== ADMIN_SECRET) {
    return res.status(401).json({ error: "Não autorizado" });
  }
  return next();
}

function generateCode() {
  // evita caracteres confusos (O/0, I/1)
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  const part = (len) =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join(
      ""
    );

  return `CP-${part(4)}-${part(4)}-${part(4)}`;
}

/**
 * GET /billing/whatsapp?plan=monthly|yearly
 */
router.get("/whatsapp", async (req, res) => {
  try {
    const plan = String(req.query.plan || "").toLowerCase();

    let message = "Olá! Quero assinar o CardapioPro.";

    if (plan === "monthly") {
      message = "Olá! Quero assinar o CardapioPro no plano Mensal (R$ 29,90/mês).";
    } else if (plan === "yearly") {
      message = "Olá! Quero assinar o CardapioPro no plano Anual (R$ 299,90/ano).";
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
 * ✅ ADMIN: gerar códigos
 * POST /billing/admin/generate
 * headers: x-admin-secret: <ADMIN_SECRET>
 * body: { plan: "monthly" | "yearly", quantity?: number }
 */
router.post("/admin/generate", requireAdminSecret, async (req, res) => {
  try {
    const plan = String(req.body?.plan || "").toLowerCase();
    const quantityRaw = Number(req.body?.quantity || 1);

    const quantity = Math.max(1, Math.min(50, isNaN(quantityRaw) ? 1 : quantityRaw));

    let days = 0;

    if (plan === "monthly") days = 30;
    else if (plan === "yearly") days = 365;
    else return res.status(400).json({ error: "Plano inválido" });

    const createdCodes = [];

    for (let i = 0; i < quantity; i++) {
      let saved = null;

      // tenta até 10x pra evitar colisão (raríssimo)
      for (let t = 0; t < 10; t++) {
        const code = generateCode();

        try {
          saved = await prisma.activationCode.create({
            data: {
              code,
              plan, // enum no prisma: monthly/yearly
              days,
            },
          });
          break;
        } catch (err) {
          // colisão de unique (ou outro erro)
        }
      }

      if (!saved) {
        return res.status(500).json({ error: "Falha ao gerar código (colisão)" });
      }

      createdCodes.push(saved.code);
    }

    return res.json({
      ok: true,
      plan,
      quantity: createdCodes.length,
      codes: createdCodes,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao gerar códigos" });
  }
});

/**
 * ✅ MERCHANT: ativar assinatura por código seguro (one-time)
 * POST /billing/activate
 * body: { code: "CP-XXXX-XXXX-XXXX" }
 */
router.post("/activate", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: "Não autenticado" });

    const code = String(req.body?.code || "").trim().toUpperCase();
    if (!code) return res.status(400).json({ error: "Código é obrigatório" });

    const restaurant = await prisma.restaurant.findFirst({
      where: { ownerId: userId },
      include: { subscription: true },
    });

    if (!restaurant) {
      return res.status(400).json({ error: "Sem restaurante cadastrado" });
    }

    const found = await prisma.activationCode.findUnique({
      where: { code },
    });

    if (!found) {
      return res.status(400).json({ error: "Código inválido" });
    }

    if (found.usedAt) {
      return res.status(400).json({ error: "Este código já foi utilizado" });
    }

    const now = new Date();

    // se já estava ativo e ainda não expirou, soma em cima do paidUntil atual
    const baseDate =
      restaurant.subscription?.paidUntil &&
      new Date(restaurant.subscription.paidUntil) > now
        ? new Date(restaurant.subscription.paidUntil)
        : now;

    const paidUntil = new Date(baseDate);
    paidUntil.setDate(paidUntil.getDate() + found.days);

    if (!restaurant.subscription) {
      await prisma.subscription.create({
        data: {
          restaurantId: restaurant.id,
          status: "ACTIVE",
          paidUntil,
          trialEndsAt: null,
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

    await prisma.activationCode.update({
      where: { id: found.id },
      data: {
        usedAt: now,
        usedById: userId,
      },
    });

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
