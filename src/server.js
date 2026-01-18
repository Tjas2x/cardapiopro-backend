const restaurantsRoutes = require("./routes/restaurants.routes");
const publicOrdersRoutes = require("./routes/public.orders.routes");

const ordersRoutes = require("./routes/orders.routes");
require("dotenv").config();

const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth.routes");
const productsRoutes = require("./routes/products.routes");
const merchantRestaurantsRoutes = require("./routes/merchant.restaurants.routes");

const app = express();

/* =========================
   CORS (Vercel + Localhost)
========================= */
app.use(
  cors({
    origin: [
      "https://cardapiopro-web.vercel.app",
      "http://localhost:3000",
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ✅ Preflight sem usar app.options("*") ou app.options("/*")
app.use((req, res, next) => {
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
