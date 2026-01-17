const prisma = require("../lib/prisma");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

async function login(email, password) {
  const user = await prisma.user.findUnique({
    where: { email },
  });

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

module.exports = { login };
