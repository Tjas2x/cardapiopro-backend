const express = require("express");
const router = express.Router();

router.get("/whatsapp", async (req, res) => {
  const PHONE = "5595991143280";

  const text =
    "Olá! Quero assinar o CardapioPro. Meu teste expirou e quero liberar meu acesso.";

  return res.json({
    phone: PHONE,
    message: text,
    whatsappUrl: `https://wa.me/${PHONE}?text=${encodeURIComponent(text)}`,
  });
});

module.exports = router;
