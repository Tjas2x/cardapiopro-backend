console.log("🔥 AUTHCONTROLLER REAL CARREGADO:", __filename);

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { prisma } = require("../lib/prisma");

/**
 * 🔐 LOGIN (INALTERADO — exatamente como você já tinha)
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
 * ✅ RESET SIMPLES — PASSO 1
 * POST /auth/forgot-password
 * Apenas valida e devolve o e-mail para o app
 */
async function forgotPassword(req, res) {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();

    console.log("🔹 FORGOT-PASSWORD RECEBIDO:", { email });

    if (!email) {
      return res.status(400).json({ error: "E-mail ausente" });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    // NÃO revelamos se o e-mail existe (boa prática)
    return res.json({
      ok: true,
      email,        // <-- ESSENCIAL para a próxima tela do app
      exists: !!user,
    });
  } catch (err) {
    console.error("❌ ERRO FORGOT PASSWORD:", err);
    return res.status(500).json({ error: "Erro ao processar solicitação" });
  }
}

/**
 * ✅ RESET SIMPLES — PASSO 2 (CORRIGIDO)
 * POST /auth/reset-password
 * Troca a senha diretamente pelo e-mail
 */
async function resetPassword(req, res) {
  try {
    // NORMALIZAÇÃO (CORREÇÃO CRÍTICA)
    const email = String(req.body?.email || "").trim().toLowerCase();
    const newPassword = String(req.body?.newPassword || "").trim();

    console.log("🔹 RESET RECEBIDO:", {
      email,
      newPasswordLength: newPassword.length,
    });

    // VALIDAÇÕES CLARAS (sem falso positivo)
    if (!email) {
      console.error("❌ RESET: email vazio");
      return res.status(400).json({ error: "Dados inválidos: e-mail ausente" });
    }

    if (!newPassword) {
      console.error("❌ RESET: senha vazia");
      return res.status(400).json({ error: "Dados inválidos: senha ausente" });
    }

    if (newPassword.length < 6) {
      console.error("❌ RESET: senha muito curta");
      return res.status(400).json({ error: "Senha muito curta" });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.error("❌ RESET: usuário não encontrado para", email);
      return res.status(400).json({ error: "Usuário não encontrado" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed },
    });

    console.log("✅ SENHA ALTERADA COM SUCESSO PARA:", email);

    return res.json({ ok: true });
  } catch (err) {
    console.error("❌ ERRO RESET PASSWORD:", err);
    return res.status(500).json({ error: "Erro ao redefinir senha" });
  }
}

module.exports = {
  login,
  forgotPassword,
  resetPassword,
};
