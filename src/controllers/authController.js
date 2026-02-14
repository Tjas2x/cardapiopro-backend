console.log("🔥 AUTHCONTROLLER REAL CARREGADO:", __filename);

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { prisma } = require("../lib/prisma");

/**
 * 🔐 LOGIN
 */
async function login(req, res) {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "").trim();

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
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
    console.error("❌ ERRO LOGIN:", err);
    return res.status(500).json({ error: "Erro no login" });
  }
}

/**
 * 🆕 REGISTER COM AUTO-CRIAÇÃO DE RESTAURANTE
 */
async function register(req, res) {
  try {
    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "").trim();

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Dados inválidos" });
    }

    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return res.status(400).json({ error: "E-mail já cadastrado" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        role: "MERCHANT",
      },
    });

    // 🚀 AUTO CRIA RESTAURANTE
    await prisma.restaurant.create({
      data: {
        name: name,
        ownerId: user.id,
      },
    });

    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
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
    console.error("❌ ERRO REGISTER:", err);
    return res.status(500).json({ error: "Erro no cadastro" });
  }
}

/**
 * RESET — PASSO 1
 */
async function forgotPassword(req, res) {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ error: "E-mail ausente" });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    return res.json({
      ok: true,
      email,
      exists: !!user,
    });
  } catch (err) {
    console.error("❌ ERRO FORGOT PASSWORD:", err);
    return res.status(500).json({ error: "Erro ao processar solicitação" });
  }
}

/**
 * RESET — PASSO 2
 */
async function resetPassword(req, res) {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const newPassword = String(req.body?.newPassword || "").trim();

    if (!email) {
      return res.status(400).json({ error: "Dados inválidos: e-mail ausente" });
    }

    if (!newPassword) {
      return res.status(400).json({ error: "Dados inválidos: senha ausente" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Senha muito curta" });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(400).json({ error: "Usuário não encontrado" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed },
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error("❌ ERRO RESET PASSWORD:", err);
    return res.status(500).json({ error: "Erro ao redefinir senha" });
  }
}

module.exports = {
  login,
  register,
  forgotPassword,
  resetPassword,
};
