import mongoose from "mongoose";

const rideSchema = new mongoose.Schema(
  {
    passenger: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Passenger",
      required: true,
    },

    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
    },

    pickup: {
      address: String,
      placeId: String,
      coordinates: { type: [Number], index: "2dsphere" },
    },

    drop: {
      address: String,
      placeId: String,
      coordinates: { type: [Number], index: "2dsphere" },
    },

    vehicleType: {
      type: String,
      enum: ["bike", "auto", "cab"],
      required: true,
    },

    distance: Number,

    routeDetails: {
      distanceMeters: Number,
      durationSeconds: Number,
      durationInTrafficSeconds: Number,
      polyline: String,
      summary: String,
      bounds: mongoose.Schema.Types.Mixed,
      legs: [mongoose.Schema.Types.Mixed],
    },

    fareEstimate: Number,

    fare: {
      total: Number,
      baseFare: Number,
      platformFee: Number,
      driverShare: Number,
    },

    otpForStartRide: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "accepted",
        "driver_arrived",
        "started",
        // Legacy: previously written on OTP start; retained for in-flight docs.
        "ongoing",
        "completed",
        "cancelled",
        "missed",
      ],
      default: "pending",
    },

    acceptedAt: { type: Date },

    arrivedAt: { type: Date },

    startedAt: { type: Date },

    completedAt: { type: Date },

    // Driver currently holding the pending offer (sequential rotation).
    currentOfferedDriver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      default: null,
      index: true,
    },

    // Drivers who missed/ignored the offer in the current rotation cycle.
    // Cleared when the cycle resets so they become eligible again.
    skippedDrivers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Driver",
      },
    ],

    notifiedDrivers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Driver",
      },
    ],

    // Drivers who rejected the ride
    rejectedDrivers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Driver",
      },
    ],

    cancellation: {
      cancelledBy: {
        type: String,
        enum: ["Passenger", "Driver", "Admin"],
        default: null,
      },
      reasonCode: {
        type: String,
      },
      reasonText: {
        type: String,
      },
      cancelledAt: { type: Date },
    },

    // Payment information
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "online"],
      default: "cash",
      required: true,
    },

    paymentProvider: {
      type: String,
      enum: ["cash", "razorpay", null],
      default: null,
    },

    paymentOrderId: {
      type: String,
      default: null,
    },

    paymentStatus: {
      type: String,
      enum: ["unpaid", "pending", "paid", "failed", "refunded"],
      default: "unpaid",
    },
    isActive: { type: Boolean, default: true, index: true },

    isPaymentRequiredBeforeRide: {
      type: Boolean,
      default: false,
    },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
    transactionDate: { type: Date },
  },

  { timestamps: true },
);

rideSchema.index({ passenger: 1, createdAt: -1 });
rideSchema.index({ driver: 1, createdAt: -1 });
rideSchema.index({ status: 1, currentOfferedDriver: 1 });

rideSchema.pre("validate", function (next) {
  if (this.status === "cancelled") {
    const { reasonCode, reasonText, cancelledBy, cancelledAt } =
      this.cancellation || {};

    if (!reasonCode || !reasonText || !cancelledBy || !cancelledAt) {
      return next(new Error("Incomplete cancellation information"));
    }
  }

  next();
});

export const Ride = mongoose.model("Ride", rideSchema);
