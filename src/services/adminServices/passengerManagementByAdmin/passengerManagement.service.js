import mongoose from "mongoose";
import { passengerRepository } from "../../../repositories/passenger.repository.js";
import { getPassengerStats } from "../../../services/rideServices/rideStats.service.js";
import { USER_STATUS, getStatusUpdateMessage } from "../../../constants/userStatus.constants.js";
import { normalizePassengerMediaUrls } from "../../../utils/mediaUrl.js";
import { mapLegacyIsActiveToPassengerStatus } from "../../../helpers/passengerStatus.helper.js";

// -------------------- Get All Passengers --------------------
export async function getAllPassenger(filters = {}) {
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
  if (isActive !== undefined) {
    query.status = mapLegacyIsActiveToPassengerStatus(isActive === true || isActive === "true");
  }

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
    return {
      ...normalizePassengerMediaUrls(passenger.toObject()),
      rideStats: stats
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
  const passenger = await passengerRepository.findById(passengerId)
    .populate({
      path: "bankDetails",
    });
  if (!passenger) throw new Error("Passenger not found");

  const stats = await getPassengerStats(passengerId);

  return {
    ...normalizePassengerMediaUrls(passenger.toObject()),
    rideStats: stats
  };
}

// -------------------- Update Passenger Active Status --------------------
export async function updatePassengerActiveStatus(passengerId, isActive) {
  if (!passengerId) throw new Error("Passenger ID is required");
  if (!mongoose.Types.ObjectId.isValid(passengerId)) {
    throw new Error("Invalid passenger ID format");
  }
  if (typeof isActive !== "boolean") {
    throw new Error("isActive must be a boolean");
  }

  const passenger = await passengerRepository.findById(passengerId);
  if (!passenger) throw new Error("Passenger not found");

  // Backward-compatible API: legacy isActive now maps onto passenger account status.
  passenger.status = mapLegacyIsActiveToPassengerStatus(isActive);
  await passenger.save();

  return {
    message: getStatusUpdateMessage("User", isActive),
    passenger: normalizePassengerMediaUrls(passenger.toObject()),
  };
}

// -------------------- Update Passenger Lifecycle Status --------------------
export async function updatePassangerStatus(passengerId, newStatus) {
  if (!Object.values(USER_STATUS).includes(newStatus)) {
    throw new Error("Invalid status value");
  }

  const passenger = await passengerRepository.findById(passengerId);
  if (!passenger) throw new Error("Passenger not found");

  passenger.status = newStatus;
  await passenger.save();

  return {
    message: `Passenger status updated to ${newStatus}`,
    passenger: normalizePassengerMediaUrls(passenger.toObject()),
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
