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

// 🔔 PUSH
const pushRoutes = require("./routes/push.routes");

const app = express();

/* =========================
   CORS - MOBILE (ALLOW ALL)
========================= */
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, x-admin-secret"
  );

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

// 🔵 Novo fluxo
app.use("/merchant/restaurants", merchantRestaurantsRoutes);

// 🟢 Compatibilidade APK V3 (usa /merchant/register)
app.use("/merchant", merchantRestaurantsRoutes);

app.use("/public/orders", publicOrdersRoutes);

// ✅ /me
app.use(meRoutes);

// ✅ billing
app.use("/billing", billingRoutes);

// 🔔 PUSH TOKEN
app.use(pushRoutes);

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
