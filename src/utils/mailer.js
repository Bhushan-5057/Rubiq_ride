import nodemailer from "nodemailer";
import dotenv from "dotenv";
import fs from "fs"
import path from "path"
dotenv.config();

//---------------------- Create Gmail ----------------------
async function createGmailTransporter() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!pass || !user) {
    throw new Error("EMAIL_USER or EMAIL_PASS not found in environment")
  }

  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: { user, pass },
    tls: { rejectUnauthorized: false, },
  });
}

//---------------------- Create Ethereal Transporter ----------------------
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

//----------------- Send Email -----------------
export async function sendEmail({ to, subject, text, html }) {
  if (!to) throw new Error("sendEmail: 'to' is required");
  if (!subject) subject = "No subject";

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
    console.error(
      "Gmail send failed:",
      err && err.message ? err.message : err
    );
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
    return {
      ok: true,
      provider: "ethereal",
      previewUrl: nodemailer.getTestMessageUrl(info),
      info,
      testAccount,
    };
  } catch (err) {
    console.error("Ethereal fallback failed:", err);
    throw new Error("All email providers failed");
  }
}

//---------------------------- Render Email Template ---------------------------- 

export function renderTemplate(templateName, variables = {}) {
  const filePath = path.join(
    process.cwd(),
    "src",
    "template",
    templateName
  );

  let html = fs.readFileSync(filePath, "utf8");

  Object.keys(variables).forEach((key) => {
    html = html.replace(
      new RegExp(`{{${key}}}`, "g"),
      variables[key] ?? ""
    );
  });

  return html;
}
