import mongoose from "mongoose";
import documentSchema from "./driverDocument.model.js";
import {
  DRIVER_APPROVAL_STATUS,
  DRIVER_AVAILABILITY_STATUS,
  USER_STATUS,
} from "../../constants/userStatus.constants.js";
import {
  createQueryGeoSyncMiddleware,
  createSaveGeoSyncMiddleware,
} from "../../utils/geoLocationSync.js";

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
      enum: Object.values(DRIVER_APPROVAL_STATUS),
      default: DRIVER_APPROVAL_STATUS.INCOMPLETED,
    },
    documentsVerified: { type: Boolean, default: false },
    verificationRemarks: { type: String },
    profileCompleted: { type: Boolean, default: false },
    welcomeEmailSent: { type: Boolean, default: false, },
    status: {
      type: String,
      enum: [USER_STATUS.ACTIVE, USER_STATUS.PENDING, USER_STATUS.INACTIVE, USER_STATUS.BLOCKED],
      default: USER_STATUS.PENDING
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
    driverStatus: {
      type: String,
      enum: Object.values(DRIVER_AVAILABILITY_STATUS),
      default: DRIVER_AVAILABILITY_STATUS.UNAVAILABLE
    },
    currentRide: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ride",
      default: null,
    },
    lastRideCompletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

driverSchema.pre(
  "save",
  createSaveGeoSyncMiddleware({
    modelName: "Driver",
    locationField: "location",
    longitudeField: "longitude",
    latitudeField: "latitude",
  }),
);

driverSchema.pre(
  "findOneAndUpdate",
  createQueryGeoSyncMiddleware({
    modelName: "Driver",
    locationField: "location",
    longitudeField: "longitude",
    latitudeField: "latitude",
  }),
);
driverSchema.pre(
  "updateOne",
  createQueryGeoSyncMiddleware({
    modelName: "Driver",
    locationField: "location",
    longitudeField: "longitude",
    latitudeField: "latitude",
  }),
);
driverSchema.pre(
  "updateMany",
  createQueryGeoSyncMiddleware({
    modelName: "Driver",
    locationField: "location",
    longitudeField: "longitude",
    latitudeField: "latitude",
  }),
);
driverSchema.pre(
  "replaceOne",
  createQueryGeoSyncMiddleware({
    modelName: "Driver",
    locationField: "location",
    longitudeField: "longitude",
    latitudeField: "latitude",
  }),
);
driverSchema.pre(
  "findOneAndReplace",
  createQueryGeoSyncMiddleware({
    modelName: "Driver",
    locationField: "location",
    longitudeField: "longitude",
    latitudeField: "latitude",
  }),
);


driverSchema.index({ location: "2dsphere" });

export const Driver = mongoose.models.Driver || mongoose.model('Driver', driverSchema);
