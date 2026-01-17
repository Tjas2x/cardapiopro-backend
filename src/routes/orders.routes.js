const express = require("express");
const { authMiddleware } = require("../middlewares/authMiddleware");

const {
  listOrders,
  createOrder,
  updateOrderStatus,
} = require("../controllers/ordersController");

const router = express.Router();

router.use(authMiddleware);

router.get("/", listOrders);
router.post("/", createOrder);
router.patch("/:id/status", updateOrderStatus);

module.exports = router;
