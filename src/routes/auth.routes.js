const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// LOGIN
router.post("/login", authController.login);

// RESET SIMPLES (sem e-mail, sem SendGrid)
// Passo 1 — verifica se e-mail existe
router.post("/forgot-password", authController.forgotPassword);

// Passo 2 — troca senha direto pelo app
router.post("/reset-password", authController.resetPassword);

module.exports = router;
