import mongoose from "mongoose";
import { USER_STATUS } from "../../constants/userStatus.constants.js";
import {
  createQueryGeoSyncMiddleware,
  createSaveGeoSyncMiddleware,
} from "../../utils/geoLocationSync.js";

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
    status: {
      type: String,
      enum: [USER_STATUS.ACTIVE, USER_STATUS.INACTIVE, USER_STATUS.BLOCKED, USER_STATUS.PENDING],
      default: USER_STATUS.ACTIVE
    },
    blockedReason: { type: String, trim: true, default: null },
    adminComment: { type: String, trim: true, default: null },
    blockedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null },
    blockedAt: { type: Date, default: null },
    blockedUsingRiskAssessment: { type: Boolean, default: false },
    riskAssessmentSnapshot: {
      level: { type: String, default: null },
      complaintsCount: { type: Number, default: 0 },
      cancellationRate: { type: Number, default: 0 },
      missedRides: { type: Number, default: 0 },
      capturedAt: { type: Date, default: null },
    },
    // Durable counters for Passenger app profile / history.
    rideStats: {
      completed: { type: Number, default: 0 },
      cancelled: { type: Number, default: 0 },
    },
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
    // Legacy scalar aliases kept for dual-write / API compatibility.
    // Canonical query field is `location` (GeoJSON Point, [lng, lat]).
    longitude: Number,
    latitude: Number,
    locationUpdatedAt: { type: Date, default: null },
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

passengerSchema.pre(
  "save",
  createSaveGeoSyncMiddleware({
    modelName: "Passenger",
    locationField: "location",
    longitudeField: "longitude",
    latitudeField: "latitude",
  }),
);

passengerSchema.pre(
  "findOneAndUpdate",
  createQueryGeoSyncMiddleware({
    modelName: "Passenger",
    locationField: "location",
    longitudeField: "longitude",
    latitudeField: "latitude",
  }),
);
passengerSchema.pre(
  "updateOne",
  createQueryGeoSyncMiddleware({
    modelName: "Passenger",
    locationField: "location",
    longitudeField: "longitude",
    latitudeField: "latitude",
  }),
);
passengerSchema.pre(
  "updateMany",
  createQueryGeoSyncMiddleware({
    modelName: "Passenger",
    locationField: "location",
    longitudeField: "longitude",
    latitudeField: "latitude",
  }),
);
passengerSchema.pre(
  "replaceOne",
  createQueryGeoSyncMiddleware({
    modelName: "Passenger",
    locationField: "location",
    longitudeField: "longitude",
    latitudeField: "latitude",
  }),
);
passengerSchema.pre(
  "findOneAndReplace",
  createQueryGeoSyncMiddleware({
    modelName: "Passenger",
    locationField: "location",
    longitudeField: "longitude",
    latitudeField: "latitude",
  }),
);

passengerSchema.index({ location: "2dsphere" });

export const Passenger =
  mongoose.models.Passenger || mongoose.model("Passenger", passengerSchema);