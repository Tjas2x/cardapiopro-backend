const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

exports.sendMail = async ({ to, subject, html }) => {
  await transporter.sendMail({
    from: `"CardapioPro" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
};
