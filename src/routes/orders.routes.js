const express = require("express");
const { authMiddleware } = require("../middlewares/authMiddleware");

const { listOrders, updateOrderStatus } = require("../controllers/ordersController");

const router = express.Router();

// ✅ Protegido (somente comerciante)
router.get("/", authMiddleware, listOrders);
router.patch("/:id/status", authMiddleware, updateOrderStatus);

module.exports = router;
