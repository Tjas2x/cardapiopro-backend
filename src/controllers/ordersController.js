const { prisma } = require("../lib/prisma");

async function getMyRestaurantId(userId) {
  const restaurant = await prisma.restaurant.findFirst({
    where: { ownerId: userId },
    select: { id: true },
  });
  return restaurant?.id || null;
}

async function listOrders(req, res) {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: "Não autenticado" });

    const restaurantId = await getMyRestaurantId(userId);
    if (!restaurantId) return res.json([]);

    const orders = await prisma.order.findMany({
      where: { restaurantId },
      include: {
        items: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(orders);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao listar pedidos" });
  }
}

async function createOrder(req, res) {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: "Não autenticado" });

    const restaurantId = await getMyRestaurantId(userId);
    if (!restaurantId) {
      return res.status(400).json({ error: "Usuário não possui restaurante" });
    }

    const { customerName, customerPhone, deliveryAddress, items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Pedido sem itens" });
    }

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
        throw new Error("Produto inválido (não pertence ao restaurante ou inativo)");
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
        items: { create: orderItemsData },
      },
      include: { items: true },
    });

    return res.status(201).json(order);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Erro ao criar pedido" });
  }
}

async function updateOrderStatus(req, res) {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: "Não autenticado" });

    const restaurantId = await getMyRestaurantId(userId);
    if (!restaurantId) return res.status(400).json({ error: "Sem restaurante" });

    const { id } = req.params;
    const { status } = req.body;

    const order = await prisma.order.findFirst({
      where: { id, restaurantId },
      select: { id: true },
    });

    if (!order) return res.status(404).json({ error: "Pedido não encontrado" });

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
