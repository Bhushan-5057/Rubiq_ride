import { Driver } from "../models/driver/driver.model.js";
import { Passenger } from "../models/passenger/passenger.model.js";
import {
  calculateRiskAssessment,
  getComplaintStats,
} from "./riskAssessment.helper.js";

/**
 * Atomically increment embedded rideStats counters and refresh driver risk snapshot
 * when missed rides change.
 */
export async function incrementDriverRideStat(driverId, field, by = 1) {
  if (!driverId || !["completed", "cancelled", "missed"].includes(field)) {
    return null;
  }

  const driver = await Driver.findByIdAndUpdate(
    driverId,
    {
      $inc: { [`rideStats.${field}`]: by },
    },
    { new: true },
  );

  if (!driver) return null;

  if (field === "missed") {
    await refreshDriverRiskSnapshot(driver);
  }

  return driver;
}

export async function incrementPassengerRideStat(passengerId, field, by = 1) {
  if (!passengerId || !["completed", "cancelled"].includes(field)) {
    return null;
  }

  return Passenger.findByIdAndUpdate(
    passengerId,
    {
      $inc: { [`rideStats.${field}`]: by },
    },
    { new: true },
  );
}

export async function refreshDriverRiskSnapshot(driverDoc) {
  const driver =
    driverDoc?.rideStats != null
      ? driverDoc
      : await Driver.findById(driverDoc?._id || driverDoc);

  if (!driver) return null;

  const complaints = await getComplaintStats(driver._id, "Driver");
  const rideStats = {
    completed: driver.rideStats?.completed || 0,
    cancelled: driver.rideStats?.cancelled || 0,
    missed: driver.rideStats?.missed || 0,
  };

  const riskAssessment = calculateRiskAssessment({
    userId: driver._id,
    userType: "Driver",
    complaints,
    rideStats,
  });

  driver.riskAssessmentSnapshot = {
    level: riskAssessment.level,
    complaintsCount: riskAssessment.complaintsCount,
    cancellationRate: riskAssessment.cancellationRate,
    missedRides: riskAssessment.missedRides,
    capturedAt: new Date(),
  };

  await driver.save();
  return driver;
}

export function readDriverRideStats(driver) {
  return {
    completed: driver?.rideStats?.completed || 0,
    cancelled: driver?.rideStats?.cancelled || 0,
    missed: driver?.rideStats?.missed || 0,
  };
}

export function readPassengerRideStats(passenger) {
  return {
    completed: passenger?.rideStats?.completed || 0,
    cancelled: passenger?.rideStats?.cancelled || 0,
  };
}
