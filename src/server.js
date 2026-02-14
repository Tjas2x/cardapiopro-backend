require("dotenv").config();

const express = require("express");

const authRoutes = require("./routes/auth.routes");
const productsRoutes = require("./routes/products.routes");
const ordersRoutes = require("./routes/orders.routes");

const restaurantsRoutes = require("./routes/restaurants.routes");
const merchantRestaurantsRoutes = require("./routes/merchant.restaurants.routes");
const publicOrdersRoutes = require("./routes/public.orders.routes");

const adminFixRoutes = require("./routes/admin.fix.routes");

// ✅ /me
const meRoutes = require("./routes/me.routes");

// ✅ billing
const billingRoutes = require("./routes/billing.routes");

const app = express();

/* =========================
   CORS manual (Vercel + Localhost + LAN)
========================= */
const allowedOrigins = [
  "https://cardapiopro-web.vercel.app",
  "http://localhost:3000",
];

function isLocalNetworkOrigin(origin) {
  // ✅ aceita: http://192.168.x.x:3000 (ou qualquer porta)
  return /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin);
}

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (
    origin &&
    (allowedOrigins.includes(origin) || isLocalNetworkOrigin(origin))
  ) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS"
  );

  // ✅ inclui x-admin-secret (pra admin tools) e aceita padrões do fetch
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, x-admin-secret"
  );

  res.setHeader("Vary", "Origin");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

/* =========================
   Middlewares
========================= */
app.use(express.json());

/* =========================
   Routes
========================= */
app.use(adminFixRoutes);

app.use("/auth", authRoutes);
app.use("/products", productsRoutes);
app.use("/orders", ordersRoutes);

app.use("/restaurants", restaurantsRoutes);
app.use("/merchant/restaurants", restaurantsRoutes);

app.use("/merchant/restaurants", merchantRestaurantsRoutes);
app.use("/public/orders", publicOrdersRoutes);

// ✅ /me
app.use(meRoutes);

// ✅ /billing
app.use("/billing", billingRoutes);

app.get("/", (req, res) => {
  res.send("Backend comerciante online 🚀");
});

/* =========================
   Start server
========================= */
const PORT = process.env.PORT || 4000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Backend comerciante rodando na porta ${PORT}`);
});
