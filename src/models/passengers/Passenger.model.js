import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const passengerSchema = new mongoose.Schema(
  {
    contactNumber: { type: String, unique: true, required: false },
    otp: { type: String, select: false },
    otpExpiry: { type: Date, select: false },
    otpVerified: { type: Boolean, default: false },
    name: { type: String, trim: true },
    profileImage: { type: String },
    dateOfBirth: { type: Date },
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
    password: { type: String, select: false },
    lastLogoutAt: { type: Date },
    profileCompleted: { type: Boolean, default: false },
    status: { type: String, enum: ["active", "suspended"], default: "active" },
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
  },

  { timestamps: true }
);

passengerSchema.pre("save", async function (next) {
  if (this.isModified("password") && this.password) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  next();
});

passengerSchema.methods.comparePassword = async function (password) {
  if (!this.password) return false;
  return bcrypt.compare(password, this.password);
};

export const Passenger =
  mongoose.models.Passenger || mongoose.model("Passenger", passengerSchema);

