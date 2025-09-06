import nodemailer from 'nodemailer';
import { env } from './env';
export const mailer = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
});
export async function sendMail({ to, subject, text, html }:{
  to:string; subject:string; text?:string; html?:string;
}) {
  return mailer.sendMail({ from: env.SMTP_FROM, to, subject, text, html });
}

