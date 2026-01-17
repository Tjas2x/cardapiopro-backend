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

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/products", productsRoutes);
app.use("/orders", ordersRoutes);
app.use("/restaurants", restaurantsRoutes);
app.use("/merchant/restaurants", merchantRestaurantsRoutes);
app.use("/public/orders", publicOrdersRoutes);


app.get("/", (req, res) => {
  res.send("Backend comerciante online 🚀");
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Backend comerciante rodando na porta ${PORT}`);
});
