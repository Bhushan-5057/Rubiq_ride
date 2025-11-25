import mongoose from "mongoose";
import  {Driver}  from "../../../models/driver/driver.model.js";
import { Ride } from "../../../models/ride/ride.model.js";
import { normalizeNumber } from "../../../helpers/helper.js";

//service to update driver status by admin
export async function updateDriverStatus(driverId, newStatus) {
  if (!["active","pending" ,"suspended"].includes(newStatus))
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

  const driverIds = drivers.map((d) => d._id);

  // Aggregate earnings and completed rides per driver in one query
  const earningsByDriver = await Ride.aggregate([
    {
      $match: {
        driver: { $in: driverIds },
        status: "completed",
      },
    },
    {
      $group: {
        _id: "$driver",
        totalEarnings: {
          $sum: { $ifNull: ["$fareEstimate", 0] },
        },
        totalCompletedRides: { $sum: 1 },
      },
    },
  ]);

  const earningsMap = new Map(
    earningsByDriver.map((e) => [e._id.toString(), e])
  );

  return drivers.map((driver) => {
    const d = driver.toObject();
    const earnings = earningsMap.get(driver._id.toString());

    return {
      ...d,
      totalEarnings: earnings?.totalEarnings || 0,
      totalCompletedRides: earnings?.totalCompletedRides || 0,
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

  // Calculate earnings and total completed rides for this driver
  const completedRides = await Ride.find({
    driver: driverId,
    status: "completed",
  }).select("fareEstimate");

  const totalEarnings = completedRides.reduce(
    (sum, ride) => sum + (ride.fareEstimate || 0),
    0
  );

  const driverObj = driver.toObject();

  return {
    ...driverObj,
    totalEarnings,
    totalCompletedRides: completedRides.length,
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

  driver.status = "suspended";
  await driver.save();

  return { message: "Driver account suspended successfully" };
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