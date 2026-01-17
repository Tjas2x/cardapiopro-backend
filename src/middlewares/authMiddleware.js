const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token ausente" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev_secret");

    // padrão: { sub: userId, email, role }
    req.user = payload;

    return next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido" });
  }
}

module.exports = { authMiddleware };
