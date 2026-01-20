const express = require("express");
const { authMiddleware } = require("../middlewares/authMiddleware");
const { prisma } = require("../lib/prisma");

const router = express.Router();

/**
 * GET /me
 * Retorna usuário + restaurante do comerciante logado, incluindo assinatura
 */
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: "Não autenticado" });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, active: true },
    });

    const restaurant = await prisma.restaurant.findFirst({
      where: { ownerId: userId },
      select: {
        id: true,
        name: true,
        description: true,
        phone: true,
        address: true,
        isOpen: true,
        subscription: {
          select: {
            status: true,
            trialEndsAt: true,
            paidUntil: true,
          },
        },
      },
    });

    return res.json({ user, restaurant });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao carregar perfil" });
  }
});

module.exports = router;
