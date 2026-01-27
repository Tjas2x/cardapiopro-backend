const express = require("express");
const router = express.Router();

const { prisma } = require("../lib/prisma");

/**
 * Regras:
 * - Bloqueio por assinatura (SOMENTE NA CRIAÇÃO)
 * - Calcula total pelo banco (snapshot)
 * - Salva pagamento (paymentMethod / cashChangeForCents)
 * - Aceita customerAddress OU deliveryAddress
 * - Retorna orderId para tracking
 */

function isValidPaymentMethod(pm) {
  return (
    pm === "PIX" ||
    pm === "CARD_CREDIT" ||
    pm === "CARD_DEBIT" ||
    pm === "CASH"
  );
}

/**
 * ===============================
 * GET /public/orders/:id
 * Cliente acompanha o pedido
 * ===============================
 */
router.get("/:id", async (req, res) => {
  try {
    // 🔥 GARANTE QUE NUNCA FIQUE EM CACHE
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    const orderId = req.params.id;

    if (!orderId) {
      return res.status(400).json({ error: "orderId é obrigatório" });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,

        customerName: true,
        customerPhone: true,
        deliveryAddress: true,

        totalCents: true,
        paymentMethod: true,
        cashChangeForCents: true,
        paid: true,
        createdAt: true,

        restaurant: {
          select: {
            id: true,
            name: true,
            phone: true,
            address: true,
          },
        },

        items: {
          select: {
            id: true,
            quantity: true,
            unitPriceCents: true,
            nameSnapshot: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: "Pedido não encontrado" });
    }

    // ✅ compatibilidade com frontend
    return res.json({
      ...order,
      customerAddress: order.deliveryAddress ?? null,
    });
  } catch (err) {
    console.error(err);
    const msg = String(err?.message || "");
    return res.status(500).json({ error: msg || "Erro ao buscar pedido" });
  }
});

/**
 * ===============================
 * POST /public/orders
 * Criar pedido
 * ===============================
 */
router.post("/", async (req, res) => {
  try {
    const {
      restaurantId,
      customerName,
      customerPhone,
      customerAddress,
      deliveryAddress,
      items,
      paymentMethod,
      cashChangeForCents,
    } = req.body;

    if (!restaurantId) {
      return res.status(400).json({ error: "restaurantId é obrigatório" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Pedido sem itens" });
    }

    /**
     * 🔒 BLOQUEIO POR ASSINATURA
     * ⚠️ SOMENTE NA CRIAÇÃO
     */
    const subscription = await prisma.subscription.findFirst({
      where: { restaurantId },
      orderBy: { createdAt: "desc" },
      select: { status: true, trialEndsAt: true, paidUntil: true },
    });

    if (!subscription) {
      return res.status(402).json({
        error: "Assinatura necessária para receber pedidos.",
        code: "SUBSCRIPTION_REQUIRED",
      });
    }

    const now = new Date();

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

    if (subscription.status === "ACTIVE") {
      const paidUntil = subscription.paidUntil
        ? new Date(subscription.paidUntil)
        : null;

      if (paidUntil && now > paidUntil) {
        return res.status(402).json({
          error: "Restaurante sem assinatura ativa no momento.",
          code: "SUBSCRIPTION_EXPIRED",
        });
      }
    }

    if (
      subscription.status === "EXPIRED" ||
      subscription.status === "CANCELED"
    ) {
      return res.status(402).json({
        error: "Restaurante sem assinatura ativa no momento.",
        code: "SUBSCRIPTION_EXPIRED",
      });
    }

    // ✅ validar pagamento
    const safePaymentMethod = paymentMethod || "PIX";

    if (!isValidPaymentMethod(safePaymentMethod)) {
      return res.status(400).json({
        error:
          "paymentMethod inválido. Use PIX, CARD_CREDIT, CARD_DEBIT ou CASH.",
      });
    }

    let safeCashChangeForCents = null;

    if (safePaymentMethod === "CASH") {
      if (cashChangeForCents !== undefined && cashChangeForCents !== null) {
        const v = Number(cashChangeForCents);
        if (!Number.isInteger(v) || v <= 0) {
          return res
            .status(400)
            .json({ error: "cashChangeForCents inválido" });
        }
        safeCashChangeForCents = v;
      }
    }

    const resolvedDeliveryAddress =
      customerAddress ?? deliveryAddress ?? null;

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

    if (safePaymentMethod === "CASH" && safeCashChangeForCents !== null) {
      if (safeCashChangeForCents < totalCents) {
        return res.status(400).json({
          error: "Troco inválido: deve ser maior ou igual ao total do pedido.",
        });
      }
    }

    const order = await prisma.order.create({
      data: {
        restaurantId,
        customerName: customerName ?? null,
        customerPhone: customerPhone ?? null,
        deliveryAddress: resolvedDeliveryAddress,
        totalCents,
        status: "NEW",

        paymentMethod: safePaymentMethod,
        cashChangeForCents: safeCashChangeForCents,
        paid: false,

        items: { create: orderItemsData },
      },
      include: { items: true },
    });

    return res.status(201).json({
      orderId: order.id,
      status: order.status,
      totalCents: order.totalCents,
      paymentMethod: order.paymentMethod,
      cashChangeForCents: order.cashChangeForCents,
      createdAt: order.createdAt,
    });
  } catch (err) {
    console.error(err);

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
