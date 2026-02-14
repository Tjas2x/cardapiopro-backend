const express = require("express");
const router = express.Router();

const { authMiddleware } = require("../middlewares/authMiddleware");
const { requireActiveSubscription } = require("../middlewares/subscriptionMiddleware");
const { prisma } = require("../lib/prisma");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");


// 🟢 PUBLICO - Cadastro (compatível com APK V3)
router.post("/register", async (req, res) => {
  try {

    const name =
      req.body.name ||
      req.body.restaurantName ||
      req.body.ownerName;

    const email = req.body.email;
    const password = req.body.password;
    const phone = req.body.phone;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Campos obrigatórios faltando" });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({ error: "Email já em uso" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: passwordHash,
        name,
        role: "MERCHANT",
      },
    });

    const restaurant = await prisma.restaurant.create({
      data: {
        name,
        phone,
        ownerId: user.id,
      },
    });

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 7);

    const subscription = await prisma.subscription.create({
      data: {
        restaurantId: restaurant.id,
        status: "TRIAL",
        trialEndsAt,
      },
    });

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
      user,
      restaurant,
      subscription,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro ao registrar restaurante" });
  }
});


// 🔒 A PARTIR DAQUI EXIGE LOGIN
router.use(authMiddleware);


/**
 * POST /merchant/restaurants
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


// 🔒 EXIGE ASSINATURA ATIVA
router.use(requireActiveSubscription);


/**
 * GET /merchant/restaurants/me
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
