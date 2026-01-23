const express = require("express");
const router = express.Router();

const { prisma } = require("../lib/prisma");

// POST /public/orders
router.post("/", async (req, res) => {
  try {
    const {
      restaurantId,
      customerName,
      customerPhone,
      deliveryAddress,
      items,
    } = req.body;

    if (!restaurantId) {
      return res.status(400).json({ error: "restaurantId é obrigatório" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Pedido sem itens" });
    }

    // ✅ BLOQUEIO POR ASSINATURA (TRIAL/EXPIRED/CANCELED)
    const subscription = await prisma.subscription.findFirst({
      where: { restaurantId },
      orderBy: { createdAt: "desc" },
      select: { status: true, trialEndsAt: true },
    });

    if (!subscription) {
      return res.status(402).json({
        error: "Assinatura necessária para receber pedidos.",
        code: "SUBSCRIPTION_REQUIRED",
      });
    }

    const now = new Date();

    // TRIAL expirado
    if (subscription.status === "TRIAL") {
      const end = subscription.trialEndsAt
        ? new Date(subscription.trialEndsAt)
        : null;

      if (end && now > end) {
        return res.status(402).json({
          error: "Restaurante indisponível: teste expirou.",
          code: "TRIAL_EXPIRED",
        });
      }
    }

    // EXPIRED / CANCELED
    if (
      subscription.status === "EXPIRED" ||
      subscription.status === "CANCELED"
    ) {
      return res.status(402).json({
        error: "Restaurante sem assinatura ativa no momento.",
        code: "SUBSCRIPTION_EXPIRED",
      });
    }

    // ✅ Buscar produtos do restaurante (garante que não mistura restaurante)
    const productIds = items.map((i) => i.productId);

    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        restaurantId,
        active: true,
      },
      select: { id: true, name: true, priceCents: true },
    });

    const map = new Map(products.map((p) => [p.id, p]));

    let totalCents = 0;

    const orderItemsData = items.map((i) => {
      const qty = Number(i.quantity);

      if (!Number.isInteger(qty) || qty <= 0) {
        // mantém compatível com seu fluxo atual
        throw new Error("Quantidade inválida");
      }

      const p = map.get(i.productId);
      if (!p) {
        throw new Error(
          "Produto inválido (não pertence ao restaurante ou inativo)"
        );
      }

      totalCents += p.priceCents * qty;

      return {
        productId: p.id,
        quantity: qty,
        unitPriceCents: p.priceCents,
        nameSnapshot: p.name,
      };
    });

    const order = await prisma.order.create({
      data: {
        restaurantId,
        customerName: customerName ?? null,
        customerPhone: customerPhone ?? null,
        deliveryAddress: deliveryAddress ?? null,
        totalCents,
        status: "NEW",
        items: { create: orderItemsData },
      },
      include: { items: true },
    });

    return res.status(201).json(order);
  } catch (err) {
    console.error(err);

    // ✅ Se for erro do usuário (produto inválido/quantidade inválida), retorna 400 (mais correto)
    const msg = String(err?.message || "");

    if (
      msg.includes("Quantidade inválida") ||
      msg.includes("Produto inválido")
    ) {
      return res.status(400).json({ error: msg });
    }

    return res.status(500).json({ error: msg || "Erro ao criar pedido" });
  }
});

module.exports = router;
