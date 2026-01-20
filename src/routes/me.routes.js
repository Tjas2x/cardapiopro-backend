const express = require("express");
const { authMiddleware } = require("../middlewares/authMiddleware");
const { prisma } = require("../lib/prisma");

const router = express.Router();

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.sub;

    if (!userId) {
      return res.status(401).json({ error: "Token inválido (sub ausente)" });
    }

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
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

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

    return res.json({ user, restaurant });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao buscar /me" });
  }
});

module.exports = router;
