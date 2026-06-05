import mongoose from "mongoose";
import { driverRepository } from "../../../repositories/driver.repository.js";
import { normalizeNumber } from "../../../helpers/helper.js";
import { getDriverStats } from "../../../services/rideServices/rideStats.service.js";
import { normalizeDriverMediaUrls } from "../../../utils/mediaUrl.js";
import {
  DRIVER_AVAILABILITY_STATUS,
  USER_STATUS,
  getStatusUpdateMessage,
} from "../../../constants/userStatus.constants.js";

//---------------------------- Update Driver Lifecycle Status ----------------------------
export async function updateDriverStatus(driverId, newStatus) {
  if (!Object.values(USER_STATUS).includes(newStatus)) {
    throw new Error("Invalid status value");
  }

  const driver = await driverRepository.findById(driverId);
  if (!driver) throw new Error("Driver not found");

  driver.status = newStatus;

  if (newStatus !== USER_STATUS.ACTIVE) {
    driver.isOnline = false;
    driver.driverStatus = DRIVER_AVAILABILITY_STATUS.UNAVAILABLE;
    driver.lastOffline = new Date();
  }

  await driver.save();

  const stats = await getDriverStats(driver._id);
  const normalizedDriver = normalizeDriverMediaUrls(driver.toObject());
  return {
    message: `Driver status updated to ${newStatus}`,
    driver: {
      ...normalizedDriver,
      rideStats: stats
    },
  };
}

//---------------------------- Update Driver Active Status ----------------------------
export async function updateDriverActiveStatus(driverId, isActive) {
  if (!mongoose.Types.ObjectId.isValid(driverId)) {
    throw new Error("Invalid driver ID format");
  }
  if (typeof isActive !== "boolean") {
    throw new Error("isActive must be a boolean");
  }

  const driver = await driverRepository.findById(driverId);
  if (!driver) throw new Error("Driver not found");

  driver.isActive = isActive;

  if (!isActive) {
    driver.isOnline = false;
    driver.driverStatus = DRIVER_AVAILABILITY_STATUS.UNAVAILABLE;
    driver.lastOffline = new Date();
  }

  await driver.save();

  const stats = await getDriverStats(driver._id);
  const normalizedDriver = normalizeDriverMediaUrls(driver.toObject());
  return {
    message: getStatusUpdateMessage("User", isActive),
    driver: {
      ...normalizedDriver,
      rideStats: stats,
    },
  };
}

//---------------------------- Get All Drivers ----------------------------
export async function getAllDrivers(filters = {}) {
  const {
    page = 1,
    limit = 5,
    status,
    isActive,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = filters;

  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
  const query = {};

  if (status) query.status = status;
  if (isActive !== undefined) query.isActive = isActive === true || isActive === "true";

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
    const normalizedDriver = normalizeDriverMediaUrls(driver.toObject());
    return {
      ...normalizedDriver,
      rideStats: stats,
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
  return {
    ...normalizeDriverMediaUrls(driver.toObject()),
    rideStats
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
    isActive: driver.isActive,
  };
}
