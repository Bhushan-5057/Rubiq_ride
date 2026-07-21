import { SOCKET_EVENTS, emitToDriver } from "../config/socket/socket.js";
import { emitAdminRideEvent } from "./admin-realtime.helper.js";
import { Ride } from "../models/ride/ride.model.js";
import { findNearbyDrivers } from "./nearbyDrivers.helper.js";

export async function autoAssignRideToNextDriver(ride) {
  try {
    const nearbyDrivers = await findNearbyDrivers(ride.pickup.coordinates, {
      vehicleType: ride.vehicleType,
    });

    if (!nearbyDrivers || nearbyDrivers.length === 0) {
      console.log(`No nearby drivers found for ride ${ride._id}`);
      return false;
    }

    const driverIds = nearbyDrivers.map((driver) => driver._id.toString());
    console.log(
      `Found ${driverIds.length} nearby drivers for ride ${ride._id}`,
    );

    await Ride.findByIdAndUpdate(ride._id, {
      $addToSet: { notifiedDrivers: { $each: driverIds } },
      status: "pending",
    });

    nearbyDrivers.forEach((driver) => {
      emitToDriver(driver._id, SOCKET_EVENTS.RIDE_REQUESTED, {
        rideId: ride._id,
        pickup: ride.pickup,
        drop: ride.drop,
        fare: ride.fareEstimate,
        vehicleType: ride.vehicleType,
      });
    });

    await emitAdminRideEvent("admin:new_ride", ride, {
      action: "auto_assigned_to_nearby_drivers",
      notifiedDriverIds: driverIds,
    });

    return true;
  } catch (error) {
    console.error("Error in autoAssignRideToNextDriver:", error);
    throw error;
  }
}
