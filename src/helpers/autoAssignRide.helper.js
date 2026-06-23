import { SOCKET_EVENTS, emitToDriver } from "../config/socket/socket.js";
import { emitAdminRideEvent } from "./admin-realtime.helper.js";
import { Driver } from "../models/driver/driver.model.js";
import { Ride } from "../models/ride/ride.model.js";
import { driverRideEligibilityQuery } from "./driverStatus.helper.js";

export async function autoAssignRideToNextDriver(ride) {
  try {
    const nearbyDrivers = await findNearbyDrivers(ride.pickup.coordinates);

    if (!nearbyDrivers || nearbyDrivers.length === 0) {
      console.log(`No nearby drivers found for ride ${ride._id}`);
      return false;
    }

    const driverIds = nearbyDrivers.map(driver => driver._id.toString());
    console.log(`Found ${driverIds.length} nearby drivers for ride ${ride._id}`);

    // Update ride with potential drivers
    await Ride.findByIdAndUpdate(ride._id, {
      $addToSet: { notifiedDrivers: { $each: driverIds } },
      status:"pending"
    });

    // Notify each driver
    nearbyDrivers.forEach(driver => {
      emitToDriver(driver._id, SOCKET_EVENTS.RIDE_REQUESTED, {
        rideId: ride._id,
        pickup: ride.pickup,
        drop: ride.drop,
        fare: ride.fareEstimate,
        vehicleType: ride.vehicleType
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

async function findNearbyDrivers(pickupLocation, maxDistance = 5000) {
  try {
    return await Driver.find(driverRideEligibilityQuery({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: pickupLocation
          },
          $maxDistance: maxDistance
        }
      },
    })).select('_id location');
  } catch (error) {
    console.error("Error finding nearby drivers:", error);
    return [];
  }
}
