const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// LOGIN
router.post("/login", authController.login);

// 🆕 REGISTER (CRIAR CONTA)
router.post("/register", authController.register);

// RESET SIMPLES
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

module.exports = router;
