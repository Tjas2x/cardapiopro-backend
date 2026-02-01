let transporter = null;

try {
  const nodemailer = require("nodemailer");

  // valida se TODAS as variáveis existem
  if (
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.SMTP_FROM
  ) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,          // smtp.sendgrid.net
      port: Number(process.env.SMTP_PORT),  // 587
      secure: false,                        // STARTTLS
      auth: {
        user: process.env.SMTP_USER,        // "apikey"
        pass: process.env.SMTP_PASS,        // API KEY do SendGrid
      },
      tls: {
        rejectUnauthorized: false,          // 🔥 ESSENCIAL p/ SendGrid em cloud
      },
    });

    console.log("📧 SMTP configurado com sucesso");
  } else {
    console.warn("⚠️ SMTP não configurado — envio de e-mail desativado");
  }
} catch (err) {
  console.error("❌ Erro ao inicializar Nodemailer:", err.message);
  transporter = null;
}

async function sendMail({ to, subject, html }) {
  if (!transporter) {
    console.warn("📭 E-mail ignorado (SMTP indisponível):", subject);
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: `"CardapioPro" <${process.env.SMTP_FROM}>`,
      to,
      subject,
      html,
    });

    console.log("📨 Email enviado com sucesso:", info.messageId);
  } catch (err) {
    console.error("❌ Falha ao enviar e-mail:", err.message);
  }
}

module.exports = {
  sendMail,
};
