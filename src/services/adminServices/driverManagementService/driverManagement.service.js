import mongoose from "mongoose";
import { driverRepository } from "../../../repositories/driver.repository.js";
import { normalizeNumber } from "../../../helpers/helper.js";
import { getDriverStats } from "../../../services/rideServices/rideStats.service.js";
import { normalizeDriverMediaUrls } from "../../../utils/mediaUrl.js";
import {
  DRIVER_APPROVAL_STATUS,
  DRIVER_AVAILABILITY_STATUS,
  USER_STATUS,
} from "../../../constants/userStatus.constants.js";
import { getUserRiskSupportData } from "../../../helpers/riskAssessment.helper.js";

//---------------------------- Update Driver Lifecycle Status ----------------------------
export async function updateDriverStatus(driverId, newStatus, options = {}) {
  if (!driverId) throw new Error("Driver ID is required");
  if (!mongoose.Types.ObjectId.isValid(driverId)) throw new Error("Invalid driver ID");

  if (!Object.values(USER_STATUS).includes(newStatus)) {
    throw new Error("Invalid status value");
  }

  const driver = await driverRepository.findById(driverId);
  if (!driver) throw new Error("Driver not found");

  if (newStatus === USER_STATUS.ACTIVE) {
    const missing = [];
    if (driver.profileCompleted !== true) missing.push("profile completion");
    if (driver.approvalStatus !== DRIVER_APPROVAL_STATUS.APPROVED) missing.push("driver approval");
    if (driver.documentsVerified !== true) missing.push("document verification");

    if (missing.length) {
      throw new Error(
        `Driver cannot be activated until ${missing.join(", ")}.`
      );
    }
  }

  if (newStatus === USER_STATUS.INACTIVE && !options.adminComment) {
    throw new Error("adminComment is required when setting status to inactive.");
  }

  const stats = await getDriverStats(driver._id);
  const riskSupportData = await getUserRiskSupportData({
    userId: driver._id,
    userType: "Driver",
    rideStats: stats,
  });

  driver.status = newStatus;

  if (newStatus !== USER_STATUS.ACTIVE) {
    driver.isOnline = false;
    driver.driverStatus = DRIVER_AVAILABILITY_STATUS.UNAVAILABLE;
    driver.lastOffline = new Date();
  }

  if (newStatus === USER_STATUS.BLOCKED) {
    const adminComment = options.adminComment || options.blockedReason || null;
    const isRiskBlock = Boolean(riskSupportData.riskAssessment?.eligibleForBlockReview);

    if (!isRiskBlock && !options.forceBlock) {
      throw new Error(
        "Driver does not qualify for blocking without forceBlock."
      );
    }

    driver.blockedReason = adminComment;
    driver.adminComment = adminComment;
    driver.blockedUsingRiskAssessment = isRiskBlock;
    driver.blockedAt = new Date();
    driver.blockedBy = options.adminId;
    driver.riskAssessmentSnapshot = {
      level: riskSupportData.riskAssessment?.level || null,
      complaintsCount: riskSupportData.riskAssessment?.complaintsCount || 0,
      cancellationRate: riskSupportData.riskAssessment?.cancellationRate || 0,
      missedRides: riskSupportData.riskAssessment?.missedRides || 0,
      capturedAt: new Date(),
    };

    console.warn("admin_driver_block_review", {
      driverId: driver._id.toString(),
      adminId: options.adminId?.toString?.() || options.adminId,
      adminComment,
      blockedUsingRiskAssessment: isRiskBlock,
      forceBlock: options.forceBlock,
      riskAssessment: riskSupportData.riskAssessment,
    });
  } else {
    driver.blockedReason = undefined;
    driver.adminComment = undefined;
    driver.blockedAt = undefined;
    driver.blockedBy = undefined;
    driver.blockedUsingRiskAssessment = undefined;
    driver.riskAssessmentSnapshot = undefined;
  }

  await driver.save();

  const normalizedDriver = normalizeDriverMediaUrls(driver.toObject());
  return {
    message: `Driver status updated to ${newStatus}`,
    driver: {
      ...normalizedDriver,
      ...riskSupportData
    },
  };
}

//---------------------------- Get All Drivers ----------------------------
export async function getAllDrivers(filters = {}) {
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
      { vehicleNumber: searchRegex }
    ];
  }

  const total = await driverRepository.count(query);
  const drivers = await driverRepository.findAll(query, { sort, skip, limit });

  const formattedDrivers = await Promise.all(drivers.map(async (driver) => {
    const stats = await getDriverStats(driver._id);
    const riskSupportData = await getUserRiskSupportData({
      userId: driver._id,
      userType: "Driver",
      rideStats: stats,
    });
    const normalizedDriver = normalizeDriverMediaUrls(driver.toObject());
    return {
      ...normalizedDriver,
      ...riskSupportData,
      totalEarnings: driver.earnings?.totalEarnings || 0,
      totalCompletedRides: driver.rideCount?.completed || 0,
      totalDriverPayout: driver.earnings?.totalDriverPayout || 0,
      rideCount: driver.rideCount,
    };
  }));

  return {
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit)
    },
    data: formattedDrivers,
  };
}

//---------------------------- Get Driver By ID ----------------------------
export async function getDriverById(driverId) {
  if (!driverId) throw new Error("Driver ID is required");
  if (!mongoose.Types.ObjectId.isValid(driverId)) throw new Error("Invalid driver ID");

  const driver = await driverRepository.findById(driverId);
  if (!driver) throw new Error("Driver not found");

  const rideStats = await getDriverStats(driver._id);
  const riskSupportData = await getUserRiskSupportData({
    userId: driver._id,
    userType: "Driver",
    rideStats,
  });

  return {
    ...normalizeDriverMediaUrls(driver.toObject()),
    ...riskSupportData
  };
}

//---------------------------- Get Driver Profile Status ----------------------------
export async function getDriverProfileStatus(contactNumber) {
  if (!contactNumber) throw new Error("Contact number is required");

  const normalizedNumber = normalizeNumber(contactNumber);
  const driver = await driverRepository.findByContactNumber(normalizedNumber);

  if (!driver) throw new Error("Driver not found");

  return {
    otpVerified: driver.otpVerified,
    profileCompleted: driver.profileCompleted,
    name: driver.name,
    email: driver.email,
    vehicleNumber: driver.vehicleNumber,
    licenseNumber: driver.documents?.licenseNumber || null,
    status: driver.status,
  };
}
