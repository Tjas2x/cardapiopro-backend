let transporter = null;

try {
  const nodemailer = require("nodemailer");

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
      requireTLS: true,                     // 🔥 FORÇA TLS (importante)
      auth: {
        user: process.env.SMTP_USER,        // "apikey"
        pass: process.env.SMTP_PASS,        // API KEY SendGrid
      },
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });

    console.log("📧 SMTP configurado com sucesso");
  } else {
    console.warn("⚠️ SMTP não configurado — envio de e-mail desativado");
  }
} catch (err) {
  console.error("❌ Erro ao inicializar Nodemailer:", err);
  transporter = null;
}

async function sendMail({ to, subject, html }) {
  if (!transporter) {
    console.warn("📭 E-mail ignorado (SMTP indisponível):", subject);
    return;
  }

  // ❗ NÃO engolimos erro aqui — queremos VER o retorno do SendGrid
  const info = await transporter.sendMail({
    from: `"CardapioPro" <${process.env.SMTP_FROM}>`,
    to,
    subject,
    html,
  });

  console.log("📨 SENDGRID RESPONSE:");
  console.log(info);
}

module.exports = {
  sendMail,
};
