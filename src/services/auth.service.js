const { prisma } = require("../lib/prisma");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

// IMPORTA mail.service SEM CONFIAR QUE EXISTE
let mailService;
try {
  mailService = require("./mail.service");
} catch {
  mailService = null;
}

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

/**
 * 🔐 LOGIN
 */
async function login(email, password) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active) {
    throw new Error("Usuário ou senha inválidos");
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    throw new Error("Usuário ou senha inválidos");
  }

  const token = jwt.sign(
    { sub: user.id, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}

/**
 * 🔁 FORGOT PASSWORD (NUNCA lança erro)
 */
async function forgotPassword(email) {
  try {
    if (!email) return;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    // segurança: não revela se usuário existe
    if (!user) return;

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    const link = `${process.env.FRONT_RESET_URL}/reset-password?token=${token}`;

    // envio de e-mail é BEST-EFFORT
    if (mailService?.sendMail) {
      try {
        await mailService.sendMail({
          to: user.email,
          subject: "Criar nova senha",
          html: `
            <p>Você solicitou a criação de uma nova senha.</p>
            <p><a href="${link}">Criar nova senha</a></p>
            <p>Este link expira em 30 minutos.</p>
          `,
        });
      } catch (e) {
        console.warn("📭 SMTP ignorado:", e.message);
      }
    }
  } catch (e) {
    // 🔒 ABSORVE QUALQUER ERRO
    console.error("⚠️ forgotPassword absorveu erro:", e.message);
  }
}

/**
 * 🔍 VALIDAR TOKEN
 */
async function validateResetToken(token) {
  if (!token) return false;

  const record = await prisma.passwordResetToken.findUnique({
    where: { token },
  });

  if (!record) return false;
  if (record.used) return false;
  if (record.expiresAt < new Date()) return false;

  return true;
}

/**
 * 🔐 RESET PASSWORD
 */
async function resetPassword(token, newPassword) {
  if (!token || !newPassword) {
    throw new Error("Dados inválidos");
  }

  const record = await prisma.passwordResetToken.findUnique({
    where: { token },
  });

  if (!record || record.used || record.expiresAt < new Date()) {
    throw new Error("Token inválido ou expirado");
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { password: passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { used: true },
    }),
  ]);
}

module.exports = {
  login,
  forgotPassword,
  validateResetToken,
  resetPassword,
};
