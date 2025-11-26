import mongoose from "mongoose";
import  {Driver}  from "../../../models/driver/driver.model.js";
import { Ride } from "../../../models/ride/ride.model.js";
import { normalizeNumber } from "../../../helpers/helper.js";
import { calculateEarningsFromDistance } from "../../../helpers/rideHelpers.js";

//service to update driver status by admin
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

//service to get all drivers for admin
export async function getAllDrivers() {
  const drivers = await Driver.find().sort({ createdAt: -1 });

  if (!drivers.length) return [];
  return drivers.map((driver) => {
    const d = driver.toObject();

    return {
      ...d,
      totalEarnings: d.earnings?.totalEarnings || 0,
      totalCompletedRides: d.rideCount?.completed || 0,
      totalDriverPayout: d.earnings?.totalDriverPayout || 0,
      rideCount: d.rideCount,
    };
  });
}

//service to get driver by id for admin
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

//service to delete driver (soft delete)
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

//service to get driver profile status
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