let transporter = null;

try {
  const nodemailer = require("nodemailer");

  if (
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  ) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    console.warn("⚠️ SMTP não configurado — envio de e-mail desativado");
  }
} catch (err) {
  console.error("❌ Nodemailer indisponível:", err.message);
  transporter = null;
}

async function sendMail({ to, subject, html }) {
  if (!transporter) {
    console.warn("📭 E-mail ignorado (SMTP indisponível):", subject);
    return;
  }

  return transporter.sendMail({
    from: `"CardapioPro" <${process.env.SMTP_USER || "no-reply@local"}>`,
    to,
    subject,
    html,
  });
}

module.exports = {
  sendMail,
};
