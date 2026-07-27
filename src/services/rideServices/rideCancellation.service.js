import { Driver } from "../../models/driver/driver.model.js";
import { Ride } from "../../models/ride/ride.model.js";
import {
  DRIVER_CANCELLATION_REASONS,
  DRIVER_REASON_CODES,
  PASSENGER_CANCELLATION_REASONS,
  PASSENGER_REASON_CODES,
} from "../../common/cancellationReasons.js";
import { DRIVER_AVAILABILITY_STATUS } from "../../constants/userStatus.constants.js";
import { removeRideTimeoutJob } from "../../queues/rideTimeout.queue.js";
import { incrementPassengerRideStat } from "../../helpers/rideStatsCounters.helper.js";

// Cancellable only before OTP verification / ride start.
const cancellableStatuses = ["pending", "accepted", "driver_arrived"];

const cancellationConfig = {
  Passenger: {
    actorField: "passenger",
    reasonCodes: PASSENGER_REASON_CODES,
    reasons: PASSENGER_CANCELLATION_REASONS,
  },
  Driver: {
    actorField: "driver",
    reasonCodes: DRIVER_REASON_CODES,
    reasons: DRIVER_CANCELLATION_REASONS,
  },
};

export async function cancelRideService({
  rideId,
  cancelledBy,
  actorId,
  reasonCode,
  reasonText,
  paymentStatus,
}) {
  const config = cancellationConfig[cancelledBy];
  if (!config) {
    throw new Error("Invalid cancellation actor");
  }

  const ride = await Ride.findById(rideId);
  if (!ride) {
    throw new Error("Ride not found");
  }

  const actorValue = ride[config.actorField];
  if (!actorValue || actorValue.toString() !== actorId.toString()) {
    throw new Error("You are not authorized to cancel this ride");
  }

  if (!cancellableStatuses.includes(ride.status)) {
    throw new Error(`Cannot cancel the ride with status ${ride.status}`);
  }

  if (!config.reasonCodes.includes(reasonCode)) {
    throw new Error("Invalid cancellation reason");
  }

  const finalReasonText = resolveReasonText({
    reasonCode,
    reasonText,
    reasons: config.reasons,
  });

  const offeredDriverId = ride.currentOfferedDriver
    ? ride.currentOfferedDriver.toString()
    : null;

  ride.status = "cancelled";
  ride.cancellation = {
    cancelledBy,
    reasonCode,
    reasonText: finalReasonText,
    cancelledAt: new Date(),
  };
  ride.currentOfferedDriver = null;
  ride.skippedDrivers = [];

  if (paymentStatus) {
    ride.paymentStatus = paymentStatus;
  }

  await ride.save();

  await removeRideTimeoutJob(rideId);

  if (ride.driver) {
    await Driver.findByIdAndUpdate(ride.driver, {
      $set: {
        driverStatus: DRIVER_AVAILABILITY_STATUS.AVAILABLE,
        currentRide: null,
      },
      $inc: {
        "rideStats.cancelled": 1,
      },
    });
  }

  if (ride.passenger) {
    await incrementPassengerRideStat(ride.passenger, "cancelled");
  }

  // Non-schema helper field for controllers to notify the pending offer target.
  ride._offeredDriverId = offeredDriverId;

  return ride;
}

function resolveReasonText({ reasonCode, reasonText, reasons }) {
  if (reasonCode === "OTHER") {
    if (!reasonText || !reasonText.trim()) {
      throw new Error("Reason text is required for Other");
    }
    return reasonText.trim();
  }

  return reasons[reasonCode];
}
