import mongoose from "mongoose";
import { passengerRepository } from "../../../repositories/passenger.repository.js";
import { getPassengerStats } from "../../../services/rideServices/rideStats.service.js";
import { USER_STATUS } from "../../../constants/userStatus.constants.js";
import { normalizePassengerMediaUrls } from "../../../utils/mediaUrl.js";
import { getUserRiskSupportData } from "../../../helpers/riskAssessment.helper.js";

// -------------------- Get All Passengers --------------------
export async function getAllPassenger(filters = {}) {
  const {
    page = 1,
    limit = 5,
    status,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = filters;

  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
  const query = {};

  if (status) query.status = status;

  if (search) {
    const searchRegex = new RegExp(search, 'i');
    query.$or = [
      { name: searchRegex },
      { email: searchRegex },
      { contactNumber: searchRegex },
      { gender: searchRegex }
    ];
  }

  const total = await passengerRepository.count(query);
  const passengers = await passengerRepository.findAll(query, { sort, skip, limit });

  const formattedPassengers = await Promise.all(passengers.map(async (passenger) => {
    const stats = await getPassengerStats(passenger._id);
    const riskSupportData = await getUserRiskSupportData({
      userId: passenger._id,
      userType: "Passenger",
      rideStats: stats,
    });
    return {
      ...normalizePassengerMediaUrls(passenger.toObject()),
      ...riskSupportData
    };
  }));

  return {
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit)
    },
    data: formattedPassengers
  };
}

// -------------------- Get Passenger by ID --------------------
export async function getPassengerById(passengerId) {
  if (!passengerId) throw new Error("Passenger ID is required");
  if (!mongoose.Types.ObjectId.isValid(passengerId)) {
    throw new Error("Invalid passenger ID");
  }

  const passenger = await passengerRepository.findById(passengerId)
    .populate({
      path: "bankDetails",
    });
  if (!passenger) throw new Error("Passenger not found");

  const stats = await getPassengerStats(passengerId);
  const riskSupportData = await getUserRiskSupportData({
    userId: passenger._id,
    userType: "Passenger",
    rideStats: stats,
  });

  return {
    ...normalizePassengerMediaUrls(passenger.toObject()),
    ...riskSupportData
  };
}

// -------------------- Update Passenger Lifecycle Status --------------------
export async function updatePassangerStatus(passengerId, newStatus, options = {}) {
  if (!passengerId) throw new Error("Passenger ID is required");
  if (!mongoose.Types.ObjectId.isValid(passengerId)) {
    throw new Error("Invalid passenger ID");
  }

  if (!Object.values(USER_STATUS).includes(newStatus)) {
    throw new Error("Invalid status value");
  }

  const passenger = await passengerRepository.findById(passengerId);
  if (!passenger) throw new Error("Passenger not found");

  if (newStatus === USER_STATUS.ACTIVE && passenger.profileCompleted !== true) {
    throw new Error("Passenger profile is incomplete; cannot activate until profile completion is done.");
  }

  if (newStatus === USER_STATUS.INACTIVE && !options.adminComment) {
    throw new Error("adminComment is required when setting status to inactive.");
  }

  const stats = await getPassengerStats(passenger._id);
  const riskSupportData = await getUserRiskSupportData({
    userId: passenger._id,
    userType: "Passenger",
    rideStats: stats,
  });

  passenger.status = newStatus;
  if (newStatus === USER_STATUS.BLOCKED) {
    const adminComment = options.adminComment || options.blockedReason || null;
    const isRiskBlock = Boolean(riskSupportData.riskAssessment?.eligibleForBlockReview);

    if (!isRiskBlock && !options.forceBlock) {
      throw new Error(
        "Passenger does not qualify for blocking without forceBlock."
      );
    }

    passenger.blockedReason = adminComment;
    passenger.adminComment = adminComment;
    passenger.blockedUsingRiskAssessment = isRiskBlock;
    passenger.blockedAt = new Date();
    passenger.blockedBy = options.adminId;
    passenger.riskAssessmentSnapshot = {
      level: riskSupportData.riskAssessment?.level || null,
      complaintsCount: riskSupportData.riskAssessment?.complaintsCount || 0,
      cancellationRate: riskSupportData.riskAssessment?.cancellationRate || 0,
      missedRides: riskSupportData.riskAssessment?.missedRides || 0,
      capturedAt: new Date(),
    };

    console.warn("admin_passenger_block_review", {
      passengerId: passenger._id.toString(),
      adminId: options.adminId?.toString?.() || options.adminId,
      adminComment,
      blockedUsingRiskAssessment: isRiskBlock,
      forceBlock: options.forceBlock,
      riskAssessment: riskSupportData.riskAssessment,
    });
  } else {
    passenger.blockedReason = undefined;
    passenger.adminComment = undefined;
    passenger.blockedAt = undefined;
    passenger.blockedBy = undefined;
    passenger.blockedUsingRiskAssessment = undefined;
    passenger.riskAssessmentSnapshot = undefined;
  }

  await passenger.save();

  return {
    message: `Passenger status updated to ${newStatus}`,
    passenger: {
      ...normalizePassengerMediaUrls(passenger.toObject()),
      ...riskSupportData,
    },
  };
}

// -------------------- Get Passenger Profile Status --------------------
export async function getPassengerProfileStatus(contactNumber) {
  if (!contactNumber.startsWith("+")) contactNumber = "+91" + contactNumber;

  const passenger = await passengerRepository.findByContactNumber(contactNumber);
  if (!passenger) throw new Error("Passenger not found");

  return {
    otpVerified: passenger.otpVerified,
    profileCompleted: passenger.profileCompleted,
    name: passenger.name,
    email: passenger.email,
    gender: passenger.gender,
    status: passenger.status,
  };
}
