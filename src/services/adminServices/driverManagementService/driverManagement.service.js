import mongoose from "mongoose";
import  {Driver}  from "../../../models/driver/driver.model.js";
import { normalizeNumber } from "../../../helpers/helper.js";

//---------------------------- Update Driver Status ----------------------------
export async function updateDriverStatus(driverId, newStatus) {
  if (!["active","pending","deactive"].includes(newStatus))
    throw new Error("Invalid status value");

  const driver = await Driver.findById(driverId);
  if (!driver) throw new Error("Driver not found");

  driver.status = newStatus;
  await driver.save();

  return {
    message: `Driver status updated to ${newStatus}`,
    driver: driver,
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
      { vehicleNumber: searchRegex }
    ];
  }

  // Get total count for pagination
  const total = await Driver.countDocuments(query);
  
  // Get paginated results
  const drivers = await Driver.find(query)
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit));

  // Format the response
  const formattedDrivers = drivers.map((driver) => {
    const d = driver.toObject();
    return {
      ...d,
      totalEarnings: d.earnings?.totalEarnings || 0,
      totalCompletedRides: d.rideCount?.completed || 0,
      totalDriverPayout: d.earnings?.totalDriverPayout || 0,
      rideCount: d.rideCount,
    };
  });

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
  if (!mongoose.Types.ObjectId.isValid(driverId))
    throw new Error("Invalid driver ID");

  const driver = await Driver.findById(driverId);
  if (!driver) throw new Error("Driver not found");
  const driverObj = driver.toObject();

  return {
    ...driverObj,
    totalEarnings: driverObj.earnings?.totalEarnings || 0,
    totalDriverPayout: driverObj.earnings?.totalDriverPayout || 0,
    // totalPlatformFee: driverObj.earnings?.totalPlatformFee || 0,
    totalCompletedRides: driverObj.rideCount?.completed || 0,
    rideCount: driverObj.rideCount,
  };
}

//---------------------------- Delete Driver  ----------------------------
export async function deleteDriver(driverId) {
  if (!mongoose.Types.ObjectId.isValid(driverId)) {
    throw new Error("Invalid driver ID format");
  }

  const driver = await Driver.findById(driverId);
  if (!driver) throw new Error("Driver not found");

  driver.status = "deactive";
  await driver.save();

  return { message: "Driver account deactive successfully" };
}

//---------------------------- Get Driver Profile Status ----------------------------
export async function getDriverProfileStatus(contactNumber) {
  if (!contactNumber) throw new Error("Contact number is required");

  const normalizedNumber = normalizeNumber(contactNumber);

  const driver = await Driver.findOne({ contactNumber: normalizedNumber });

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