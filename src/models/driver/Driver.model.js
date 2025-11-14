import mongoose from "mongoose";
import documentSchema from "../driver/document.schema.js";


const driverSchema = new mongoose.Schema(
  {
    contactNumber: { type: String, unique: true, required: true },
    otp: { type: String, select: false },
    otpExpiry: { type: Date, select: false },
    otpVerified: { type: Boolean, default: false },
    profileImage: { type: String },
    name: { type: String, trim: true },
    email: { type: String, unique: true, sparse: true },
    licenseNumber: { type: String, unique: true, sparse: true },
    vehicleNumber: { type: String, unique: true, sparse: true },
    dateOfBirth: { type: Date},
    gender: { type: String, enum: ["male", "female", "other"], default: null },
    vehicleType: { type: String, enum: ["car", "bike", "auto"], default: null },
    city: { type: String, trim: true },
    documents: { type: documentSchema, default: {} },
    documentsVerified: { type: Boolean, default: false },
    verificationRemarks: { type: String, default: "" },
    lastLoginAt: Date,
    lastLogoutAt: Date,
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    profileCompleted: { type: Boolean, default: false },
    status: { type: String, enum: ["active", "suspended"], default: "active" },
  },
  { timestamps: true }
);

export const Driver =
  mongoose.models.Driver || mongoose.model("Driver", driverSchema);