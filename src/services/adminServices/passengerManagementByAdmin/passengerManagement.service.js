import mongoose from "mongoose";
import { Passenger } from "../../../models/passengers/passenger.model.js";

// -------------------- Get All Passengers --------------------
export async function getAllPassenger() {
  const passengers = await Passenger.find().sort({ createdAt: -1 });
  return passengers.map((p) => p);
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
  if (!["active","deactive", "suspended"].includes(newStatus))
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
