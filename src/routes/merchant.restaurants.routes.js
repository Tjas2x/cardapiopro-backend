const express = require("express");
const router = express.Router();

const { prisma } = require("../lib/prisma");
const { authMiddleware } = require("../middlewares/authMiddleware");

// Protegido
router.use(authMiddleware);

// GET /merchant/restaurants/me
router.get("/me", async (req, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: "Não autenticado" });

    const restaurant = await prisma.restaurant.findFirst({
      where: { ownerId: userId },
      select: {
        id: true,
        name: true,
        description: true,
        phone: true,
        address: true,
        isOpen: true,
        createdAt: true,
      },
    });

    if (!restaurant) {
      return res.status(404).json({ error: "Usuário não possui restaurante" });
    }

    return res.json(restaurant);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro ao buscar restaurante do dono" });
  }
});

module.exports = router;
