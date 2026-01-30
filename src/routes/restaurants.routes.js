const express = require("express");
const router = express.Router();

const { prisma } = require("../lib/prisma");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

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

// ✅ Público: registrar restaurante + owner + trial
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Campos obrigatórios faltando" });
    }

    // 1. Verificar se email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({ error: "Email já em uso" });
    }

    // 2. Hash da senha
    const passwordHash = await bcrypt.hash(password, 10);

    // 3. Criar usuário OWNER (MERCHANT)
    const user = await prisma.user.create({
      data: {
        email,
        password: passwordHash,
        name,
        role: "MERCHANT",
      },
    });

    // 4. Criar restaurante
    const restaurant = await prisma.restaurant.create({
      data: {
        name,
        phone,
        ownerId: user.id,
      },
    });

    // 5. Criar subscription TRIAL (7 dias)
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 7);

    const subscription = await prisma.subscription.create({
      data: {
        restaurantId: restaurant.id,
        status: "TRIAL",
        trialEndsAt,
      },
    });

    // 6. Criar token JWT
    const token = jwt.sign(
      {
        userId: user.id,
        restaurantId: restaurant.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      restaurant,
      subscription,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro ao registrar restaurante" });
  }
});

module.exports = router;
