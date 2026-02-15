const express = require("express");
const router = express.Router();
const { prisma } = require("../lib/prisma");
const { authMiddleware } = require("../middlewares/authMiddleware");

router.post("/push-token", authMiddleware, async (req, res) => {
  const userId = req.user.sub;
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: "Token ausente" });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { expoPushToken: token },
  });

  return res.json({ ok: true });
});

module.exports = router;
