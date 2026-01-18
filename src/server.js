const restaurantsRoutes = require("./routes/restaurants.routes");
const publicOrdersRoutes = require("./routes/public.orders.routes");

const ordersRoutes = require("./routes/orders.routes");
require("dotenv").config();

const express = require("express");

const authRoutes = require("./routes/auth.routes");
const productsRoutes = require("./routes/products.routes");
const merchantRestaurantsRoutes = require("./routes/merchant.restaurants.routes");

const app = express();

/* =========================
   CORS manual (Vercel + Localhost)
========================= */
const allowedOrigins = [
  "https://cardapiopro-web.vercel.app",
  "http://localhost:3000",
];

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
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
app.use("/auth", authRoutes);
app.use("/products", productsRoutes);
app.use("/orders", ordersRoutes);
app.use("/restaurants", restaurantsRoutes);
app.use("/merchant/restaurants", merchantRestaurantsRoutes);
app.use("/public/orders", publicOrdersRoutes);

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
