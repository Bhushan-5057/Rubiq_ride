import mongoose from "mongoose";
import documentSchema from "./driverDocument.model.js";

const driverSchema = new mongoose.Schema(
  {
    contactNumber: { type: String, required: false, default: null },
    otp: { type: String, select: false },
    otpExpiry: { type: Date, select: false },
    otpVerified: { type: Boolean, default: false },
    profileImage: { type: String },
    name: { type: String, trim: true },
    email: { type: String, unique: true, sparse: true, required: false },
    vehicleNumber: { type: String, unique: true, sparse: true },
    dateOfBirth: { type: String },
    gender: { type: String, enum: ["male", "female", "other"], default: null },
    vehicleType: { type: String, enum: ["cab", "bike", "auto"], default: null },
    city: { type: String, trim: true },
    documents: { type: documentSchema, default: {} },
    lastLogoutAt: Date,
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", "incompleted"],
      default: "incompleted",
    },
    activationStatus: { type: String, enum: ["not_ready", "ready"], default: "not_ready" },
    documentsVerified: { type: Boolean, default: false },
    verificationRemarks: { type: String },
    profileCompleted: { type: Boolean, default: false },
    welcomeEmailSent: { type: Boolean, default: false, },
    status: { type: String, enum: ["active", "pending", "deactive"], default: "pending" },
    location: {
      type: {
        type: String,
        enum: ["Point"],
      },
      coordinates: {
        type: [Number],
        default: undefined,
      },
    },
    longitude: Number,
    latitude: Number,
    earnings: {
      totalEarnings: { type: Number, default: 0 },
      totalDriverPayout: { type: Number, default: 0 },
      totalPlatformFee: { type: Number, default: 0 },
    },
    rating: {
      average: { type: Number, default: 0 },
      count: { type: Number, default: 0 }
    },
    fcmTokens: [
      {
        token: { type: String },
        platform: { type: String },
        lastActiveAt: { type: Date, default: Date.now }
      }
    ],

    isOnline: { type: Boolean, default: false },
    lastOnline: { type: Date },
    lastOffline: { type: Date },
    driverStatus: { type: String, enum: ["available", "unavailable", "on_trip"], default: "unavailable" },
  },
  { timestamps: true }
);

driverSchema.pre("save", function (next) {
  if (this.isModified("longitude") || this.isModified("latitude")) {
    if (this.longitude !== undefined && this.latitude !== undefined) {
      this.location = {
        type: "Point",
        coordinates: [this.longitude, this.latitude],
      };
    } else {
      this.location = undefined;
    }
  }

  if (
    this.location &&
    (!Array.isArray(this.location.coordinates) ||
      this.location.coordinates.length !== 2)
  ) {
    this.location = undefined;
  }
  next();
});

driverSchema.index({ location: "2dsphere" });

export const Driver = mongoose.model('Driver', driverSchema);