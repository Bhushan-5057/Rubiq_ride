import mongoose from "mongoose";
import { driverRepository } from "../../../repositories/driver.repository.js";
import { normalizeNumber } from "../../../helpers/helper.js";
import { getDriverStats } from "../../../services/rideServices/rideStats.service.js";
import { normalizeDriverMediaUrls } from "../../../utils/mediaUrl.js";
import {
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
    driver.blockedReason = options.blockedReason;
    driver.blockedAt = new Date();
    driver.blockedBy = options.adminId;

    console.warn("admin_driver_block_review", {
      driverId: driver._id.toString(),
      adminId: options.adminId?.toString?.() || options.adminId,
      blockedReason: options.blockedReason,
      riskAssessment: riskSupportData.riskAssessment,
    });
  } else if (driver.status !== USER_STATUS.BLOCKED) {
    driver.blockedReason = undefined;
    driver.blockedAt = undefined;
    driver.blockedBy = undefined;
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
    licenseNumber: driver.licenseNumber,
    status: driver.status,
  };
}
