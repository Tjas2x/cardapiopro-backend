console.log("🔥 AUTHCONTROLLER REAL CARREGADO:", __filename);

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { prisma } = require("../lib/prisma");

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

module.exports = { login };
