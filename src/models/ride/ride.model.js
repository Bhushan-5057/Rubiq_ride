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
    distance: Number,
    fareEstimate: Number,
    status: {
      type: String,
      enum: ["pending", "accepted","completed", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export const Ride = mongoose.model("Ride", rideSchema);
