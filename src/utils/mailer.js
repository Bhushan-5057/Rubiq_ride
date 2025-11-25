import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

async function createGmailTransporter() {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, 
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

async function createEtherealTransporter() {
  const testAccount = await nodemailer.createTestAccount();
  return {
    transporter: nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      auth: { user: testAccount.user, pass: testAccount.pass },
    }),
    testAccount,
  };
}
export async function sendEmail({ to, subject, text, html }) {
  if (!to) throw new Error("sendEmail: 'to' is required");
  if (!subject) subject = "No subject";

  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    try {
      const gmailTransporter = await createGmailTransporter();
      const info = await gmailTransporter.sendMail({
        from: `"Ride App" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        text,
        html,
      });
      return { ok: true, provider: "gmail", info };
    } catch (err) {
      console.error("Gmail send failed:", err && err.message ? err.message : err);
      
    }
  } else {
    console.warn("EMAIL_USER/EMAIL_PASS not set — skipping Gmail, using Ethereal for dev.");
  }


  try {
    const { transporter, testAccount } = await createEtherealTransporter();
    const info = await transporter.sendMail({
      from: `"Ride App (Ethereal)" <no-reply@rideapp.local>`,
      to,
      subject,
      text,
      html,
    });
    return { ok: true, provider: "ethereal", previewUrl: nodemailer.getTestMessageUrl(info), info, testAccount };
  } catch (err) {
    console.error("Ethereal fallback failed:", err);
    throw new Error("All email providers failed");
  }
}
