import mongoose from "mongoose";
import documentSchema from "./driverDocument.model.js";

const driverSchema = new mongoose.Schema(
  {
    contactNumber: { type: String, unique: true, required: true },
    otp: { type: String, select: false },
    otpExpiry: { type: Date, select: false },
    otpVerified: { type: Boolean, default: false },
    profileImage: { type: String },
    name: { type: String, trim: true },
    email: { type: String, unique: true, sparse: true },
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
    status: { type: String, enum: ["active", "pending","deactive"], default: "pending" },
    location: {
      type: {
        type: String,
        enum: ["Point"],
      },
      coordinates: {
        type: [Number], // [lng, lat] - GeoJSON format
        default: undefined,
      },
    },

    // these are for direct lng/lat update (optional)
    longitude: Number,
    latitude: Number,
    rideCount: {
      accepted: { type: Number, default: 0 },
      completed: { type: Number, default: 0 },
      rejected: { type: Number, default: 0 },
    },
    earnings: {
      totalEarnings: { type: Number, default: 0 },
      totalDriverPayout: { type: Number, default: 0 },
      totalPlatformFee: { type: Number, default: 0 },
    },
    feedbacks: [
      {
        rating: { type: Number, enum: [1, 2, 3, 4, 5], required: true },
        comment: { type: String },
        passenger: { type: mongoose.Schema.Types.ObjectId, ref: "Passenger" },
        ride: { type: mongoose.Schema.Types.ObjectId, ref: "Ride" },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

driverSchema.pre("save", function (next) {
  // When longitude/latitude change, keep location in sync as a valid GeoJSON Point
  if (this.isModified("longitude") || this.isModified("latitude")) {
    if (this.longitude !== undefined && this.latitude !== undefined) {
      this.location = {
        type: "Point",
        coordinates: [this.longitude, this.latitude], // GeoJSON format: [lng, lat]
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

export const Driver =
  mongoose.models.Driver || mongoose.model("Driver", driverSchema);