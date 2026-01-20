const express = require("express");
const router = express.Router();

const { authMiddleware } = require("../middlewares/authMiddleware");
const { requireActiveSubscription } = require("../middlewares/subscriptionMiddleware");
const { prisma } = require("../lib/prisma");

// ✅ logado
router.use(authMiddleware);

/**
 * POST /merchant/restaurants
 * Cria restaurante para o comerciante logado.
 * Obs: você já criou restaurante automático no /auth/register,
 * mas isso aqui é útil caso algum usuário antigo esteja sem restaurante.
 *
 * ⚠️ Não exige assinatura ativa aqui, porque ele pode estar sem restaurante ainda.
 */
router.post("/", async (req, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: "Não autenticado" });

    const existing = await prisma.restaurant.findFirst({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (existing) {
      return res.status(409).json({
        error: "Usuário já possui restaurante",
        restaurantId: existing.id,
      });
    }

    const name = String(req.body?.name || "").trim();
    const description =
      req.body?.description !== undefined && req.body?.description !== null
        ? String(req.body.description).trim()
        : null;

    const phone =
      req.body?.phone !== undefined && req.body?.phone !== null
        ? String(req.body.phone).trim()
        : null;

    const address =
      req.body?.address !== undefined && req.body?.address !== null
        ? String(req.body.address).trim()
        : null;

    if (!name) {
      return res.status(400).json({ error: "Nome do restaurante é obrigatório" });
    }

    // ✅ já cria subscription TRIAL 7 dias (se criou restaurante manualmente)
    const now = new Date();
    const trialEndsAt = new Date(now);
    trialEndsAt.setDate(trialEndsAt.getDate() + 7);

    const restaurant = await prisma.restaurant.create({
      data: {
        ownerId: userId,
        name,
        description,
        phone,
        address,
        isOpen: true,
        subscription: {
          create: {
            status: "TRIAL",
            trialEndsAt,
          },
        },
      },
      include: {
        subscription: true,
      },
    });

    return res.status(201).json(restaurant);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao criar restaurante" });
  }
});

// ✅ A partir daqui precisa assinatura ativa (editar/gerenciar)
router.use(requireActiveSubscription);

/**
 * GET /merchant/restaurants/me
 * Retorna o restaurante do comerciante logado
 */
router.get("/me", async (req, res) => {
  try {
    const restaurantId = req.restaurantId;

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: {
        subscription: {
          select: { status: true, trialEndsAt: true, paidUntil: true },
        },
      },
    });

    return res.json(restaurant);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao carregar restaurante" });
  }
});

/**
 * PATCH /merchant/restaurants/me
 * Atualiza dados do restaurante do comerciante logado
 */
router.patch("/me", async (req, res) => {
  try {
    const restaurantId = req.restaurantId;

    const name =
      req.body?.name !== undefined ? String(req.body.name || "").trim() : undefined;

    const description =
      req.body?.description !== undefined
        ? req.body.description === null
          ? null
          : String(req.body.description).trim()
        : undefined;

    const phone =
      req.body?.phone !== undefined
        ? req.body.phone === null
          ? null
          : String(req.body.phone).trim()
        : undefined;

    const address =
      req.body?.address !== undefined
        ? req.body.address === null
          ? null
          : String(req.body.address).trim()
        : undefined;

    const isOpen =
      req.body?.isOpen !== undefined ? Boolean(req.body.isOpen) : undefined;

    if (name !== undefined && !name) {
      return res.status(400).json({ error: "Nome inválido" });
    }

    const updated = await prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(address !== undefined ? { address } : {}),
        ...(isOpen !== undefined ? { isOpen } : {}),
      },
      include: {
        subscription: {
          select: { status: true, trialEndsAt: true, paidUntil: true },
        },
      },
    });

    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao atualizar restaurante" });
  }
});

module.exports = router;
