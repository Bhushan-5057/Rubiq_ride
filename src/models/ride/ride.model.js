import mongoose from "mongoose";

const rideSchema = new mongoose.Schema(
  {
    passenger: { type: mongoose.Schema.Types.ObjectId, ref: "Passenger", required: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: "Driver" },
    pickup: {
      address: String,
      coordinates: { type: [Number], index: "2dsphere" },
    },
    drop: {
      address: String,
      coordinates: { type: [Number], index: "2dsphere" },
    },
    vehicleType: { type: String, enum: ["bike", "auto", "cab"], required: true },
    distance: Number,

    fareEstimate: Number,
    otpForStartRide: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "ongoing", "on_the_way", "driver_arrived", "completed", "cancelled"],
      default: "pending",
    },

    // Payment information
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "online"],
      default: "cash",
      required: true
    },
    paymentIntentId: {
      type: String,
      default: null
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "pending", "paid", "failed", "refunded"],
      default: "unpaid"
    },
    isPaymentRequiredBeforeRide: {
      type: Boolean,
      default: false
    },
    // Legacy Stripe fields (keep for backward compatibility)
    stripePaymentIntentId: { type: String },
    stripePaymentMethod: { type: String },
    stripeCustomerId: { type: String },
    stripeChargeId: { type: String },

    transactionDate: { type: Date },
  },
  { timestamps: true }
);

export const Ride = mongoose.model("Ride", rideSchema);