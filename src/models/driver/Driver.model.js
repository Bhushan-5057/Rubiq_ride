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
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ["male", "female", "other"], default: null },
    vehicleType: { type: String, enum: ["car", "bike", "auto"], default: null },
    city: { type: String, trim: true },
    documents: { type: documentSchema, default: {} },
    lastLogoutAt: Date,
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", "incompleted", "fullfiled"],
      default: "pending",
    },
    documentsVerified: { type: Boolean, default: false },
    verificationRemarks: { type: String },
    profileCompleted: { type: Boolean, default: false },
    status: { type: String, enum: ["active", "suspended"], default: "active" },
    location: {
      type: {
        type: String,
        enum: ["Point"],
      },
      coordinates: {
        type: [Number], // [lng, lat]
        default: undefined,
      },
    },

    // these are for direct lat/lng update (optional)
    latitude: Number,
    longitude: Number,
  },
  { timestamps: true }
);
driverSchema.pre("save", function (next) {
  // When latitude/longitude change, keep location in sync as a valid GeoJSON Point
  if (this.isModified("latitude") || this.isModified("longitude")) {
    if (this.longitude !== undefined && this.latitude !== undefined) {
      this.location = {
        type: "Point",
        coordinates: [this.longitude, this.latitude],
      };
    } else {
      // If one of them is missing, clear location so MongoDB doesn't see an invalid geo value
      this.location = undefined;
    }
  }

  // Extra safety: if location exists but coordinates are missing or invalid, unset it
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

export const Driver =
  mongoose.models.Driver || mongoose.model("Driver", driverSchema);