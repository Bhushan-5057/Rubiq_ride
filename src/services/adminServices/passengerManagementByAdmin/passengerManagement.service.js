import mongoose from "mongoose";
import { Passenger } from "../../../models/passenger/passenger.model.js";

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

  // Build the query
  const query = {};

  // Add status filter if provided
  if (status) {
    query.status = status;
  }

  // Add search filter if provided
  if (search) {
    const searchRegex = new RegExp(search, 'i');
    query.$or = [
      { name: searchRegex },
      { email: searchRegex },
      { contactNumber: searchRegex },
      { gender: searchRegex }
    ];
  }

  // Get total count for pagination
  const total = await Passenger.countDocuments(query);

  // Get paginated results
  const passengers = await Passenger.find(query)
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit));

  // Format the response
  const formattedPassengers = passengers.map(passenger => ({
    ...passenger.toObject(),
    // Add any additional formatting if needed
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
  const passenger = await Passenger.findById(passengerId);
  if (!passenger) throw new Error("Passenger not found");

  return passenger;
}

// -------------------- Delete Passenger --------------------
export async function deletePassenger(passengerId) {
  if (!passengerId) throw new Error("Passenger ID is required");

  if (!mongoose.Types.ObjectId.isValid(passengerId)) {
    throw new Error("Invalid passenger ID format");
  }

  const passenger = await Passenger.findById(passengerId);
  if (!passenger) throw new Error("Passenger not found");

  passenger.status = "deactive";
  await passenger.save();

  return {
    message: "Passenger account deactive successfully",
    passenger: passenger,
  };
}

// -------------------- Update Passenger Status --------------------
export async function updatePassangerStatus(passengerId, newStatus) {
  if (!["active", "deactive", "pending"].includes(newStatus))
    throw new Error("Invalid status value");

  const passenger = await Passenger.findById(passengerId);
  if (!passenger) throw new Error("Passenger not found");

  passenger.status = newStatus;
  await passenger.save();

  return {
    message: `Passenger status updated to ${newStatus}`,
    passenger: passenger,
  };
}

// -------------------- Get Passenger Profile Status --------------------
export async function getPassengerProfileStatus(contactNumber) {
  if (!contactNumber.startsWith("+")) contactNumber = "+91" + contactNumber;

  const passenger = await Passenger.findOne({ contactNumber });
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
