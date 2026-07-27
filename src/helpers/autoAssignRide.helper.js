import { SOCKET_EVENTS, emitToDriver } from "../config/socket/socket.js";
import { Ride } from "../models/ride/ride.model.js";
import { findNearbyDrivers } from "./nearbyDrivers.helper.js";
import { addRideTimeoutJob } from "../queues/rideTimeout.queue.js";
import { RIDE_REQUEST_TIMEOUT_MS } from "../constants/ride.constants.js";
import { incrementDriverRideStat } from "./rideStatsCounters.helper.js";

function toIdString(value) {
  return value?.toString?.() || String(value);
}

function buildRideRequestPayload(ride, extra = {}) {
  return {
    rideId: ride._id,
    pickup: ride.pickup,
    drop: ride.drop,
    fare: ride.fareEstimate,
    fareEstimate: ride.fareEstimate,
    distance: ride.distance,
    routeDetails: ride.routeDetails,
    vehicleType: ride.vehicleType,
    paymentMethod: ride.paymentMethod,
    paymentStatus: ride.paymentStatus,
    ...extra,
  };
}

/**
 * Offer a pending ride to the next eligible nearby driver (sequential rotation).
 * Ride status remains pending. After all nearby drivers in a cycle have been
 * skipped, the cycle resets so previously skipped drivers become eligible again.
 */
export async function offerRideToNextDriver(
  ride,
  {
    scheduleTimeout = true,
    passengerPayload = null,
    emitSocket = true,
  } = {},
) {
  if (!ride?._id) {
    return { offered: false, driver: null, nearbyDrivers: [] };
  }

  if (ride.status && ride.status !== "pending") {
    return { offered: false, driver: null, nearbyDrivers: [] };
  }

  const skippedIds = (ride.skippedDrivers || []).map(toIdString);

  let nearbyDrivers = await findNearbyDrivers(ride.pickup.coordinates, {
    vehicleType: ride.vehicleType,
    extraQuery: skippedIds.length
      ? {
          _id: {
            $nin: skippedIds.map((id) => id),
          },
        }
      : {},
  });

  // Full cycle exhausted — clear skips and search again.
  if ((!nearbyDrivers || nearbyDrivers.length === 0) && skippedIds.length > 0) {
    console.log(
      `Ride ${ride._id}: rotation cycle complete, re-opening skipped drivers`,
    );
    await Ride.findByIdAndUpdate(ride._id, {
      $set: { skippedDrivers: [], currentOfferedDriver: null },
    });
    ride.skippedDrivers = [];
    ride.currentOfferedDriver = null;

    nearbyDrivers = await findNearbyDrivers(ride.pickup.coordinates, {
      vehicleType: ride.vehicleType,
    });
  }

  if (!nearbyDrivers || nearbyDrivers.length === 0) {
    console.log(`No nearby drivers available for ride ${ride._id}`);
    await Ride.findByIdAndUpdate(ride._id, {
      $set: { currentOfferedDriver: null, status: "pending" },
    });

    // Keep searching while the passenger waits.
    if (scheduleTimeout) {
      await addRideTimeoutJob(ride._id.toString(), RIDE_REQUEST_TIMEOUT_MS, {
        forceNew: true,
      });
    }

    return { offered: false, driver: null, nearbyDrivers: [] };
  }

  const driver = nearbyDrivers[0];

  const updatedRide = await Ride.findByIdAndUpdate(
    ride._id,
    {
      $set: {
        currentOfferedDriver: driver._id,
        status: "pending",
      },
      $addToSet: { notifiedDrivers: driver._id },
    },
    { new: true },
  );

  Object.assign(ride, updatedRide?.toObject?.() || updatedRide || {});

  const payload = buildRideRequestPayload(updatedRide || ride, {
    ...(passengerPayload || {}),
  });

  if (emitSocket) {
    try {
      emitToDriver(driver._id, SOCKET_EVENTS.RIDE_REQUESTED, payload);
    } catch (error) {
      console.warn(
        `Socket emit skipped for ride ${ride._id}:`,
        error.message,
      );
    }
  }

  if (scheduleTimeout) {
    await addRideTimeoutJob(ride._id.toString(), RIDE_REQUEST_TIMEOUT_MS, {
      forceNew: true,
    });
  }

  console.log(
    `Ride ${ride._id} offered to driver ${driver._id} (${nearbyDrivers.length} nearby candidates)`,
  );

  return {
    offered: true,
    driver,
    nearbyDrivers,
    ride: updatedRide || ride,
  };
}

/**
 * Mark the currently offered driver as having missed the request.
 * Atomic on status=pending so concurrent accept cannot be double-processed.
 * Does NOT change ride status away from pending.
 */
export async function markCurrentDriverMissed(ride) {
  const offeredDriverId = ride.currentOfferedDriver;
  if (!offeredDriverId) {
    return { missedDriverId: null, stillPending: true };
  }

  const updated = await Ride.findOneAndUpdate(
    {
      _id: ride._id,
      status: "pending",
      currentOfferedDriver: offeredDriverId,
    },
    {
      $set: { currentOfferedDriver: null },
      $addToSet: { skippedDrivers: offeredDriverId },
    },
    { new: true },
  );

  if (!updated) {
    // Ride was accepted/cancelled concurrently — do not attribute a miss.
    return { missedDriverId: null, stillPending: false };
  }

  const missedDriverId = toIdString(offeredDriverId);
  ride.currentOfferedDriver = null;
  ride.skippedDrivers = updated.skippedDrivers || [];
  ride.status = updated.status;

  await incrementDriverRideStat(missedDriverId, "missed");

  try {
    emitToDriver(missedDriverId, SOCKET_EVENTS.RIDE_MISSED, {
      rideId: ride._id,
      message: "Ride request missed. The request was offered to another driver.",
    });
  } catch (error) {
    console.warn(
      `Missed-ride socket emit skipped for driver ${missedDriverId}:`,
      error.message,
    );
  }

  console.log(`Driver ${missedDriverId} missed ride ${ride._id}`);

  return { missedDriverId, stillPending: true };
}

/** @deprecated Use offerRideToNextDriver — kept as alias for older imports. */
export async function autoAssignRideToNextDriver(ride) {
  const result = await offerRideToNextDriver(ride, { scheduleTimeout: true });
  return result.offered;
}
