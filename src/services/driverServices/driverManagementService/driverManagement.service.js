
import mongoose from "mongoose";
import  {Driver}  from "../../../models/driver/driver.model.js";
import { normalizeNumber } from "../../../helpers/helper.js";


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


export async function getAllDrivers() {
  const drivers = await Driver.find().sort({ createdAt: -1 });
  return drivers.map((driver) => driver);
}


export async function getDriverById(driverId) {
  if (!driverId) throw new Error("Driver ID is required");
  if (!mongoose.Types.ObjectId.isValid(driverId))
    throw new Error("Invalid driver ID");

  const driver = await Driver.findById(driverId);
  if (!driver) throw new Error("Driver not found");
  return driver;
}

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



export async function getDriverProfileStatus(contactNumber) {
  if (!contactNumber) throw new Error("Contact number is required");

  const normalizedNumber = normalizeNumber(contactNumber);

  console.log("Checking driver with contact:", normalizedNumber);

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