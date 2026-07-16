import { createTransport } from "nodemailer";

const transporter = createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendMagicLink(email: string, token: string) {
  const baseUrl = process.env.API_BASE_URL ?? "http://localhost:4000";
  const url = `${baseUrl}/auth/magic-link/verify?token=${encodeURIComponent(token)}`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? "noreply@funfsterne.de",
    to: email,
    subject: "Dein Login-Link für Fünf Sterne",
    text: `Klicke auf den Link, um dich anzumelden: ${url}\n\nDer Link ist 15 Minuten gültig.`,
    html: `<p>Klicke auf den Link, um dich anzumelden:</p>
<p><a href="${url}">${url}</a></p>
<p>Der Link ist 15 Minuten gültig.</p>`,
  });
}
