const express = require("express");
const { authMiddleware } = require("../middlewares/authMiddleware");
const {
  createProduct,
  listProducts,
  getProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/productsController");

const router = express.Router();

router.use(authMiddleware);

router.post("/", createProduct);
router.get("/", listProducts);
router.get("/:id", getProduct);
router.patch("/:id", updateProduct);
router.delete("/:id", deleteProduct);

module.exports = router;
