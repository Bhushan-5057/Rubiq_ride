import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import SystemConfig from "../models/masterConfig/systemConfig.model.js";
import { encrypt } from "../utils/crypto.js";

await mongoose.connect(process.env.MONGODB_URI);

const SYSTEM_ADMIN_ID = "6958e04af2ba82115aba723a";

// ALL env keys you want to move into MongoDB
const ENV_KEYS = [
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD",
  "ADMIN_NAME",
  "EMAIL_USER",
  "EMAIL_PASS",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_PHONE_NUMBER",
  "TWILIO_SECRET",
  "APP_NAME",
  "JWT_ACCESS_SECRET",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "RAZORPAY_WEBHOOK_SECRET",
  "STRIPE_SECRET_KEY",
  "STRIPE_PUBLIC_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "GOOGLE_CLIENT_ID",
  "CLIENT_SECRET",
  "REDIS_HOST",
  "REDIS_PORT"
];

console.log("🚀 Starting ENV migration...");

for (const key of ENV_KEYS) {
  const value = process.env[key];

  if (!value) {
    console.log("⚠️ Missing:", key);
    continue;
  }

  const encrypted = encrypt(value);

  await SystemConfig.findOneAndUpdate(
    { key },
    {
      key,
      value: encrypted,
      isActive: true,
       createdBy: SYSTEM_ADMIN_ID,
      updatedBy: SYSTEM_ADMIN_ID
    },
    { upsert: true, new: true }
  );

  console.log("✅ Imported:", key);
}

console.log("🎉 ENV migration completed.");
process.exit();
