const express = require("express");
const router = express.Router();
const { prisma } = require("../lib/prisma");

// ⚠️ rota de manutenção: usar só uma vez
router.post("/admin/fix-subscriptions", async (req, res) => {
  try {
    const restaurants = await prisma.restaurant.findMany({
      select: { id: true },
    });

    const now = new Date();
    const trialEndsAt = new Date(now);
    trialEndsAt.setDate(trialEndsAt.getDate() + 7);

    let created = 0;

    for (const r of restaurants) {
      const exists = await prisma.subscription.findUnique({
        where: { restaurantId: r.id },
        select: { id: true },
      });

      if (!exists) {
        await prisma.subscription.create({
          data: {
            restaurantId: r.id,
            status: "TRIAL",
            trialEndsAt,
          },
        });
        created++;
      }
    }

    return res.json({ ok: true, created });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao criar subscriptions" });
  }
});

module.exports = router;
