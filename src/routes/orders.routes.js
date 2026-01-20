const express = require("express");
const { authMiddleware } = require("../middlewares/authMiddleware");

const {
  listOrders,
  createOrder,
  updateOrderStatus,
} = require("../controllers/ordersController");

const router = express.Router();

// ✅ Público (cliente do cardápio finaliza o pedido)
router.post("/", createOrder);

// ✅ Protegido (somente comerciante)
router.get("/", authMiddleware, listOrders);
router.patch("/:id/status", authMiddleware, updateOrderStatus);

module.exports = router;
