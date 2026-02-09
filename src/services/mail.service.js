const nodemailer = require("nodemailer");

let transporter = null;

if (
  process.env.SMTP_HOST &&
  process.env.SMTP_PORT &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS &&
  process.env.SMTP_FROM
) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,        // smtp.sendgrid.net
    port: Number(process.env.SMTP_PORT),// 587
    secure: false,                      // STARTTLS
    auth: {
      user: process.env.SMTP_USER,      // apikey
      pass: process.env.SMTP_PASS,      // SG.xxxxx
    },
  });

  console.log("📧 SMTP SendGrid inicializado");
} else {
  console.warn("⚠️ SMTP não configurado");
}

async function sendMail({ to, subject, html }) {
  if (!transporter) {
    console.warn("📭 SMTP indisponível");
    return;
  }

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM, // ⚠️ SEM NOME, SOMENTE O EMAIL
    to,
    subject,
    html,
  });

  console.log("📨 SendGrid aceitou o envio:", info.messageId);
}

module.exports = { sendMail };
