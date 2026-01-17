const { prisma } = require("../lib/prisma");

async function getMyRestaurantId(userId) {
  const restaurant = await prisma.restaurant.findFirst({
    where: { ownerId: userId },
    select: { id: true },
  });
  return restaurant?.id || null;
}

async function createProduct(req, res) {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: "Não autenticado" });

    const { name, description, priceCents, imageUrl, active } = req.body;

    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "name é obrigatório" });
    }

    const price = Number(priceCents);
    if (!Number.isInteger(price) || price <= 0) {
      return res.status(400).json({ error: "priceCents inválido" });
    }

    const restaurantId = await getMyRestaurantId(userId);
    if (!restaurantId) {
      return res.status(400).json({ error: "Usuário não possui restaurante" });
    }

    const product = await prisma.product.create({
      data: {
        name,
        description: description ?? null,
        priceCents: price,
        imageUrl: imageUrl ?? null,
        active: active ?? true,
        restaurantId,
      },
    });

    return res.status(201).json(product);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao criar produto" });
  }
}

async function listProducts(req, res) {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: "Não autenticado" });

    const restaurantId = await getMyRestaurantId(userId);
    if (!restaurantId) return res.json([]);

    const products = await prisma.product.findMany({
      where: { restaurantId },
      orderBy: { createdAt: "desc" },
    });

    return res.json(products);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao listar produtos" });
  }
}

async function getProduct(req, res) {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: "Não autenticado" });

    const { id } = req.params;

    const restaurantId = await getMyRestaurantId(userId);
    if (!restaurantId) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    const product = await prisma.product.findFirst({
      where: { id, restaurantId },
    });

    if (!product) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    return res.json(product);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao buscar produto" });
  }
}

async function updateProduct(req, res) {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: "Não autenticado" });

    const { id } = req.params;
    const { name, description, priceCents, imageUrl, active } = req.body;

    const restaurantId = await getMyRestaurantId(userId);
    if (!restaurantId) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    const exists = await prisma.product.findFirst({
      where: { id, restaurantId },
      select: { id: true },
    });

    if (!exists) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    const data = {};

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({ error: "name inválido" });
      }
      data.name = name;
    }

    if (description !== undefined) data.description = description ?? null;

    if (priceCents !== undefined) {
      const price = Number(priceCents);
      if (!Number.isInteger(price) || price <= 0) {
        return res.status(400).json({ error: "priceCents inválido" });
      }
      data.priceCents = price;
    }

    if (imageUrl !== undefined) data.imageUrl = imageUrl ?? null;
    if (active !== undefined) data.active = !!active;

    const updated = await prisma.product.update({
      where: { id },
      data,
    });

    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao atualizar produto" });
  }
}

async function deleteProduct(req, res) {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: "Não autenticado" });

    const { id } = req.params;

    const restaurantId = await getMyRestaurantId(userId);
    if (!restaurantId) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    const exists = await prisma.product.findFirst({
      where: { id, restaurantId },
      select: { id: true },
    });

    if (!exists) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    await prisma.product.delete({ where: { id } });

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao deletar produto" });
  }
}

module.exports = {
  createProduct,
  listProducts,
  getProduct,
  updateProduct,
  deleteProduct,
};
