import mongoose from "mongoose";
import { Complaint } from "../models/complaint/complaint.model.js";

const RISK_LEVEL = Object.freeze({
  NORMAL: "normal",
  WARNING: "warning",
  HIGH: "high",
});

const DRIVER_THRESHOLDS = Object.freeze({
  complaints: { warning: 5, high: 10, blockReview: 15 },
  cancellationRate: { warning: 15, high: 25, blockReview: 35 },
  missedRides: { warning: 10, high: 20, blockReview: 30 },
});

const PASSENGER_THRESHOLDS = Object.freeze({
  complaints: { warning: 3, high: 5, blockReview: 10 },
  cancellationRate: { warning: 20, high: 40, blockReview: 60 },
  missedRides: { warning: Infinity, high: Infinity, blockReview: Infinity },
});

const OPEN_COMPLAINT_STATUSES = ["PENDING", "IN_PROGRESS"];
const RESOLVED_COMPLAINT_STATUSES = ["RESOLVED", "CLOSED"];

const emptyComplaints = () => ({
  total: 0,
  open: 0,
  resolved: 0,
});

const normalizeRideStats = (rideStats = {}) => ({
  completed: rideStats.completed || 0,
  cancelled: rideStats.cancelled || 0,
  missed: rideStats.missed || 0,
});

const calculateCancellationRate = ({ completed, cancelled }) => {
  const total = completed + cancelled;
  if (!total) return 0;
  return Number(((cancelled / total) * 100).toFixed(2));
};

const getMetricLevel = (value, thresholds) => {
  if (value >= thresholds.high) return RISK_LEVEL.HIGH;
  if (value >= thresholds.warning) return RISK_LEVEL.WARNING;
  return RISK_LEVEL.NORMAL;
};

const getRiskLevel = ({ complaintsCount, cancellationRate, missedRides }, thresholds) => {
  const levels = [
    getMetricLevel(complaintsCount, thresholds.complaints),
    getMetricLevel(cancellationRate, thresholds.cancellationRate),
    getMetricLevel(missedRides, thresholds.missedRides),
  ];

  if (levels.includes(RISK_LEVEL.HIGH)) return RISK_LEVEL.HIGH;
  if (levels.includes(RISK_LEVEL.WARNING)) return RISK_LEVEL.WARNING;
  return RISK_LEVEL.NORMAL;
};

const getBlockReviewReasons = ({ complaintsCount, cancellationRate, missedRides }, thresholds) => {
  const reasons = [];

  if (complaintsCount >= thresholds.complaints.blockReview) {
    reasons.push({
      metric: "complaintsCount",
      value: complaintsCount,
      threshold: thresholds.complaints.blockReview,
    });
  }

  if (cancellationRate >= thresholds.cancellationRate.blockReview) {
    reasons.push({
      metric: "cancellationRate",
      value: cancellationRate,
      threshold: thresholds.cancellationRate.blockReview,
    });
  }

  if (missedRides >= thresholds.missedRides.blockReview) {
    reasons.push({
      metric: "missedRides",
      value: missedRides,
      threshold: thresholds.missedRides.blockReview,
    });
  }

  return reasons;
};

const logRiskAssessment = ({ userType, userId, riskAssessment }) => {
  if (riskAssessment.level === RISK_LEVEL.NORMAL && !riskAssessment.eligibleForBlockReview) {
    return;
  }

  console.warn("risk_assessment_threshold_reached", {
    userType,
    userId: userId?.toString?.() || userId,
    level: riskAssessment.level,
    eligibleForBlockReview: riskAssessment.eligibleForBlockReview,
    complaintsCount: riskAssessment.complaintsCount,
    cancellationRate: riskAssessment.cancellationRate,
    missedRides: riskAssessment.missedRides,
    blockReviewReasons: riskAssessment.blockReviewReasons,
  });
};

export const getComplaintStats = async (userId, userType) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) return emptyComplaints();

  const stats = await Complaint.aggregate([
    {
      $match: {
        against: new mongoose.Types.ObjectId(userId),
        againstUser: userType,
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        open: {
          $sum: { $cond: [{ $in: ["$status", OPEN_COMPLAINT_STATUSES] }, 1, 0] },
        },
        resolved: {
          $sum: { $cond: [{ $in: ["$status", RESOLVED_COMPLAINT_STATUSES] }, 1, 0] },
        },
      },
    },
  ]);

  const result = stats[0] || emptyComplaints();
  return {
    total: result.total || 0,
    open: result.open || 0,
    resolved: result.resolved || 0,
  };
};

export const calculateRiskAssessment = ({
  userId,
  userType,
  complaints,
  rideStats,
}) => {
  const stats = normalizeRideStats(rideStats);
  const thresholds = userType === "Driver" ? DRIVER_THRESHOLDS : PASSENGER_THRESHOLDS;
  const complaintsCount = complaints?.total || 0;
  const cancellationRate = calculateCancellationRate(stats);
  const missedRides = stats.missed;
  const blockReviewReasons = getBlockReviewReasons(
    { complaintsCount, cancellationRate, missedRides },
    thresholds
  );

  const riskAssessment = {
    level: getRiskLevel({ complaintsCount, cancellationRate, missedRides }, thresholds),
    complaintsCount,
    cancellationRate,
    missedRides,
    eligibleForBlockReview: blockReviewReasons.length > 0,
    blockReviewReasons,
  };

  logRiskAssessment({ userType, userId, riskAssessment });
  return riskAssessment;
};

export const getUserRiskSupportData = async ({ userId, userType, rideStats }) => {
  const complaints = await getComplaintStats(userId, userType);
  const normalizedRideStats = normalizeRideStats(rideStats);
  const riskAssessment = calculateRiskAssessment({
    userId,
    userType,
    complaints,
    rideStats: normalizedRideStats,
  });

  return {
    complaints,
    rideStats: normalizedRideStats,
    riskAssessment,
  };
};
