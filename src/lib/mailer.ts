import "server-only";
import nodemailer from "nodemailer";

// SMTP se konfiguruje přes env. Bez konfigurace se e-maily neodesílají.
// SMTP_URL=smtp://user:pass@host:587  (nebo jednotlivě SMTP_HOST/PORT/USER/PASS)
// MAIL_FROM="Zásobník <sklad@klinika.cz>"
// NOTIFY_EMAIL=prijemce@klinika.cz

export function isMailConfigured(): boolean {
  return !!(process.env.SMTP_URL || process.env.SMTP_HOST) && !!process.env.NOTIFY_EMAIL;
}

// Pro odesílání objednávek dodavatelům stačí nakonfigurovaný SMTP (příjemce = e-mail dodavatele).
export function isSmtpConfigured(): boolean {
  return !!(process.env.SMTP_URL || process.env.SMTP_HOST);
}

function transport() {
  if (process.env.SMTP_URL) {
    return nodemailer.createTransport(process.env.SMTP_URL);
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
}

export async function sendNotificationMail(subject: string, text: string): Promise<void> {
  if (!isMailConfigured()) {
    throw new Error("SMTP není nakonfigurováno (chybí SMTP_URL/SMTP_HOST nebo NOTIFY_EMAIL).");
  }
  await transport().sendMail({
    from: process.env.MAIL_FROM || "Zásobník <sklad@localhost>",
    to: process.env.NOTIFY_EMAIL,
    subject,
    text,
  });
}

export type MailAttachment = { filename: string; content: string; contentType?: string };

// Obecné odeslání e-mailu (např. objednávka dodavateli) s volitelnou přílohou.
export async function sendMail(opts: {
  to: string;
  subject: string;
  text: string;
  attachments?: MailAttachment[];
}): Promise<void> {
  if (!isSmtpConfigured()) {
    throw new Error("SMTP není nakonfigurováno (chybí SMTP_URL nebo SMTP_HOST).");
  }
  await transport().sendMail({
    from: process.env.MAIL_FROM || "Zásobník <sklad@localhost>",
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    attachments: opts.attachments,
  });
}
