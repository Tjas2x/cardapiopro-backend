const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// LOGIN
router.post("/login", authController.login);

// CRIAR NOVA SENHA (RESET)
router.post("/forgot-password", authController.forgotPassword);
router.get("/reset-password/validate", authController.validateResetToken);
router.post("/reset-password", authController.resetPassword);

module.exports = router;
