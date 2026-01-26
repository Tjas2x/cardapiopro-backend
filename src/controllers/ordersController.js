// backend/controllers/ordersController.js
const { prisma } = require("../lib/prisma");

/**
 * Retorna o restaurante do dono (merchant)
 */
async function getMyRestaurantId(userId) {
  const restaurant = await prisma.restaurant.findFirst({
    where: { ownerId: userId },
    select: { id: true },
  });

  return restaurant?.id || null;
}

/**
 * ✅ LISTAR PEDIDOS (merchant)
 * Só retorna pedidos do restaurante do comerciante logado
 * ✅ Inclui paymentMethod / cashChangeForCents / paid
 */
async function listOrders(req, res) {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: "Não autenticado" });

    const restaurantId = await getMyRestaurantId(userId);
    if (!restaurantId) return res.json([]);

    const orders = await prisma.order.findMany({
      where: { restaurantId },
      orderBy: { createdAt: "desc" },

      // ✅ FORÇA retorno completo (evita “sumir” campos)
      select: {
        id: true,
        status: true,

        customerName: true,
        customerPhone: true,
        deliveryAddress: true,

        totalCents: true,
        createdAt: true,

        // ✅ pagamento
        paymentMethod: true,
        cashChangeForCents: true,
        paid: true,

        items: true,
      },
    });

    return res.json(orders);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao listar pedidos" });
  }
}

/**
 * ✅ CRIAR PEDIDO (PÚBLICO) - legado
 * ⚠️ NÃO RECOMENDADO USAR: o correto é /public/orders
 *
 * Mantido para compatibilidade, mas:
 * - bloqueia assinatura (mesma regra)
 * - aceita customerAddress OU deliveryAddress
 * - salva pagamento (paymentMethod / cashChangeForCents / paid)
 */
function isValidPaymentMethod(pm) {
  return (
    pm === "PIX" ||
    pm === "CARD_CREDIT" ||
    pm === "CARD_DEBIT" ||
    pm === "CASH"
  );
}

async function createOrder(req, res) {
  try {
    const {
      restaurantId,
      customerName,
      customerPhone,

      // compat
      customerAddress,
      deliveryAddress,

      items,

      // pagamento
      paymentMethod,
      cashChangeForCents,
    } = req.body;

    if (!restaurantId) {
      return res.status(400).json({ error: "restaurantId é obrigatório" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Pedido sem itens" });
    }

    // opcional: checar se restaurante existe e está aberto
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true, isOpen: true },
    });

    if (!restaurant) {
      return res.status(404).json({ error: "Restaurante não encontrado" });
    }

    if (!restaurant.isOpen) {
      return res.status(400).json({ error: "Restaurante está fechado" });
    }

    // ✅ BLOQUEIO POR ASSINATURA (mesma regra do /public/orders)
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

    // ACTIVE mas paidUntil vencido
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

    // ✅ pagamento (default PIX)
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
          return res.status(400).json({ error: "cashChangeForCents inválido" });
        }
        safeCashChangeForCents = v;
      } else {
        safeCashChangeForCents = null;
      }
    }

    const resolvedDeliveryAddress =
      (customerAddress ?? deliveryAddress ?? null) || null;

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

    // ✅ regra troco: se informado, tem que ser >= total
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
        deliveryAddress: resolvedDeliveryAddress ?? null,

        totalCents,
        status: "NEW",

        paymentMethod: safePaymentMethod,
        cashChangeForCents: safeCashChangeForCents,
        paid: false,

        items: { create: orderItemsData },
      },
      include: { items: true },
    });

    return res.status(201).json(order);
  } catch (err) {
    console.error(err);
    const msg = String(err?.message || "");

    if (
      msg.includes("Quantidade inválida") ||
      msg.includes("Produto inválido")
    ) {
      return res.status(400).json({ error: msg });
    }

    return res
      .status(500)
      .json({ error: msg || "Erro ao criar pedido" });
  }
}

/**
 * ✅ ATUALIZAR STATUS (merchant)
 * Merchant só altera pedidos do restaurante dele
 * e só permite transições válidas
 */
async function updateOrderStatus(req, res) {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: "Não autenticado" });

    const restaurantId = await getMyRestaurantId(userId);
    if (!restaurantId) return res.status(400).json({ error: "Sem restaurante" });

    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "status é obrigatório" });
    }

    const order = await prisma.order.findFirst({
      where: { id, restaurantId },
      select: { id: true, status: true },
    });

    if (!order) return res.status(404).json({ error: "Pedido não encontrado" });

    const allowedTransitions = {
      NEW: ["PREPARING", "CANCELED"],
      PREPARING: ["OUT_FOR_DELIVERY"],
      OUT_FOR_DELIVERY: ["DELIVERED"],
      DELIVERED: [],
      CANCELED: [],
    };

    const current = order.status;
    const allowed = allowedTransitions[current] || [];

    if (!allowed.includes(status)) {
      return res.status(400).json({
        error: `Transição inválida: ${current} → ${status}`,
      });
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status },
      include: { items: true },
    });

    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao atualizar status" });
  }
}

module.exports = {
  listOrders,
  createOrder,
  updateOrderStatus,
};
