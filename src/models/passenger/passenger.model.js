import mongoose from "mongoose";

const passengerSchema = new mongoose.Schema(
  {
    contactNumber: { type: String, required: false,default:null },
    otp: { type: String, select: false },
    otpExpiry: { type: Date, select: false },
    otpVerified: { type: Boolean, default: false },
    name: { type: String, trim: true },
    profileImage: { type: String },
    dateOfBirth: { type: String },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other", ""],
      default: "",
    },
    bankDetails: { type: mongoose.Schema.Types.ObjectId, ref: "BankAccount" },
    lastLogoutAt: { type: Date },
    profileCompleted: { type: Boolean, default: false },
    welcomeEmailSent: { type: Boolean, default: false, },
    status: { type: String, enum: ["active", "deactive"], default: "active" },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        index: "2dsphere",
      },
    },
    fcmTokens: [
      {
        token: { type: String },
        platform: { type: String },
        lastActiveAt: { type: Date, default: Date.now }
      }
    ],

    rating: {
      average: { type: Number, default: 0 },
      count: { type: Number, default: 0 }
    }
  },

  { timestamps: true }
);

export const Passenger =
  mongoose.models.Passenger || mongoose.model("Passenger", passengerSchema);