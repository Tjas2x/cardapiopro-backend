const express = require("express");
const router = express.Router();

const { prisma } = require("../lib/prisma");

// ✅ Público: listar restaurantes (para o app do cliente)
router.get("/", async (req, res) => {
  try {
    const restaurants = await prisma.restaurant.findMany({
      where: { isOpen: true },
      select: {
        id: true,
        name: true,
        description: true,
        phone: true,
        address: true,
        isOpen: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(restaurants);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro ao listar restaurantes" });
  }
});

// ✅ Público: buscar restaurante por ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
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
      return res.status(404).json({ error: "Restaurante não encontrado" });
    }

    return res.json(restaurant);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro ao buscar restaurante" });
  }
});

// ✅ Público: listar produtos de 1 restaurante
router.get("/:id/products", async (req, res) => {
  try {
    const { id } = req.params;

    const products = await prisma.product.findMany({
      where: {
        restaurantId: id,
        active: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        priceCents: true,
        imageUrl: true,
        active: true,
        restaurantId: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(products);
  } catch (e) {
    console.error(e);
    return res
      .status(500)
      .json({ error: "Erro ao listar produtos do restaurante" });
  }
});

module.exports = router;
