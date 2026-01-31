console.log("🔥 AUTHCONTROLLER REAL CARREGADO:", __filename);

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { prisma } = require("../lib/prisma");
const authService = require("../services/auth.service");

/**
 * 🔐 LOGIN (EXISTENTE — NÃO MEXIDO)
 */
async function login(req, res) {
  try {
    console.log("BODY RAW:", req.body);
    console.log("TIPOS:", typeof req.body.email, typeof req.body.password);
    console.log("🔥 LOGIN REAL CHAMADO");
    console.log("🔐 LOGIN CHEGOU NO BACKEND:", req.body);
    console.log("📱 LOGIN VINDO DO EXPO:", req.body);

    const email = String(req.body.email || "").trim();
    const password = String(req.body.password || "").trim();

    console.log("NORMALIZADO:", email, password);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({
        error: "Credenciais inválidas",
        debug: { email },
      });
    }

    const ok = await bcrypt.compare(password, user.password);

    if (!ok) {
      return res.status(401).json({
        error: "Credenciais inválidas",
        debug: { email },
      });
    }

    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET || "dev_secret",
      { expiresIn: "7d" }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro no login" });
  }
}

/**
 * 🔐 CRIAR NOVA SENHA — SOLICITAR LINK
 * POST /auth/forgot-password
 */
async function forgotPassword(req, res) {
  try {
    console.log("🔁 FORGOT PASSWORD CHAMADO:", req.body);

    const email = String(req.body.email || "").trim().toLowerCase();

    await authService.forgotPassword(email);

    // resposta genérica por segurança
    return res.json({
      ok: true,
      message:
        "Se o e-mail existir, enviaremos um link para criar uma nova senha.",
    });
  } catch (err) {
    console.error("❌ ERRO FORGOT PASSWORD:", err);
    return res.status(500).json({
      error: "Erro ao processar solicitação",
    });
  }
}

/**
 * 🔍 VALIDAR TOKEN DE RESET
 * GET /auth/reset-password/validate?token=...
 */
async function validateResetToken(req, res) {
  try {
    const token = String(req.query.token || "").trim();

    console.log("🔍 VALIDATE RESET TOKEN:", token);

    const valid = await authService.validateResetToken(token);

    return res.json({ valid });
  } catch (err) {
    console.error("❌ TOKEN INVÁLIDO:", err);
    return res.status(400).json({ valid: false });
  }
}

/**
 * 🔁 DEFINIR NOVA SENHA
 * POST /auth/reset-password
 */
async function resetPassword(req, res) {
  try {
    console.log("🔐 RESET PASSWORD BODY:", req.body);

    const token = String(req.body.token || "").trim();
    const newPassword = String(req.body.newPassword || "").trim();

    await authService.resetPassword(token, newPassword);

    return res.json({ ok: true });
  } catch (err) {
    console.error("❌ ERRO RESET PASSWORD:", err);
    return res.status(400).json({
      error: err.message || "Erro ao redefinir senha",
    });
  }
}

module.exports = {
  login,
  forgotPassword,
  validateResetToken,
  resetPassword,
};
