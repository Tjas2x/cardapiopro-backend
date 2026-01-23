const express = require("express");
const router = express.Router();

const { authMiddleware } = require("../middlewares/authMiddleware");
const {
  requireActiveSubscription,
} = require("../middlewares/subscriptionMiddleware");

const { prisma } = require("../lib/prisma");

// ✅ Protege tudo: precisa estar logado + assinatura ativa
router.use(authMiddleware);
router.use(requireActiveSubscription);

/**
 * GET /products
 * Lista produtos do restaurante do comerciante logado
 */
router.get("/", async (req, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: "Não autenticado" });

    // Se subscriptionMiddleware rodou, já temos req.restaurantId
    const restaurantId = req.restaurantId;

    const products = await prisma.product.findMany({
      where: { restaurantId },
      orderBy: { createdAt: "desc" },
    });

    return res.json(products);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao listar produtos" });
  }
});

/**
 * POST /products
 * Cria produto no restaurante do comerciante logado
 */
router.post("/", async (req, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: "Não autenticado" });

    const restaurantId = req.restaurantId;

    const name = String(req.body?.name || "").trim();
    const description =
      req.body?.description !== undefined && req.body?.description !== null
        ? String(req.body.description).trim()
        : null;

    const priceCents = Number(req.body?.priceCents);

    const imageUrl =
      req.body?.imageUrl !== undefined && req.body?.imageUrl !== null
        ? String(req.body.imageUrl).trim()
        : null;

    const active =
      req.body?.active === undefined ? true : Boolean(req.body.active);

    if (!name) {
      return res.status(400).json({ error: "Nome é obrigatório" });
    }

    if (!Number.isInteger(priceCents) || priceCents <= 0) {
      return res.status(400).json({ error: "Preço inválido (em centavos)" });
    }

    const product = await prisma.product.create({
      data: {
        restaurantId,
        name,
        description,
        priceCents,
        imageUrl,
        active,
      },
    });

    return res.status(201).json(product);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao criar produto" });
  }
});

/**
 * PUT /products/:id
 * Atualiza produto do restaurante do comerciante logado
 */
router.put("/:id", async (req, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: "Não autenticado" });

    const restaurantId = req.restaurantId;
    const { id } = req.params;

    const existing = await prisma.product.findFirst({
      where: { id, restaurantId },
      select: { id: true },
    });

    if (!existing) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    const name =
      req.body?.name !== undefined
        ? String(req.body.name || "").trim()
        : undefined;

    const description =
      req.body?.description !== undefined
        ? req.body.description === null
          ? null
          : String(req.body.description).trim()
        : undefined;

    const priceCents =
      req.body?.priceCents !== undefined
        ? Number(req.body.priceCents)
        : undefined;

    const imageUrl =
      req.body?.imageUrl !== undefined
        ? req.body.imageUrl === null
          ? null
          : String(req.body.imageUrl).trim()
        : undefined;

    const active =
      req.body?.active !== undefined ? Boolean(req.body.active) : undefined;

    if (name !== undefined && !name) {
      return res.status(400).json({ error: "Nome inválido" });
    }

    if (
      priceCents !== undefined &&
      (!Number.isInteger(priceCents) || priceCents <= 0)
    ) {
      return res.status(400).json({ error: "Preço inválido (em centavos)" });
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(priceCents !== undefined ? { priceCents } : {}),
        ...(imageUrl !== undefined ? { imageUrl } : {}),
        ...(active !== undefined ? { active } : {}),
      },
    });

    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao atualizar produto" });
  }
});

/**
 * DELETE /products/:id
 * Exclui produto do restaurante do comerciante logado
 *
 * ✅ CORREÇÃO PROFISSIONAL:
 * - Se o produto já foi usado em pedidos (OrderItem), não pode excluir.
 * - Retorna 409 e orienta desativar em vez de apagar.
 */
router.delete("/:id", async (req, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: "Não autenticado" });

    const restaurantId = req.restaurantId;
    const { id } = req.params;

    const existing = await prisma.product.findFirst({
      where: { id, restaurantId },
      select: { id: true },
    });

    if (!existing) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    // ✅ impede excluir se já existe em pedidos
    const used = await prisma.orderItem.findFirst({
      where: { productId: id },
      select: { id: true },
    });

    if (used) {
      return res.status(409).json({
        error:
          "Não é possível excluir este produto porque ele já foi usado em pedidos. Desative o produto em vez de excluir.",
      });
    }

    await prisma.product.delete({ where: { id } });

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao excluir produto" });
  }
});

module.exports = router;
