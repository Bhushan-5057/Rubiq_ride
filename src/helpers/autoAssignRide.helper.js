import { getIO } from "../config/socket/socket.js";
import { emitAdminRideEvent } from "./admin-realtime.helper.js";
import { Driver } from "../models/driver/driver.model.js";
import { Ride } from "../models/ride/ride.model.js";
import {
  DRIVER_ACTIVATION_STATUS,
  DRIVER_AVAILABILITY_STATUS,
  USER_STATUS,
} from "../constants/userStatus.constants.js";

export async function autoAssignRideToNextDriver(ride) {
  try {
    const io = getIO();
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
      io.to(driver._id.toString()).emit("new_ride_request", {
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
    return await Driver.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: pickupLocation
          },
          $maxDistance: maxDistance
        }
      },
      isOnline: true,
      isActive: true,
      status: USER_STATUS.ACTIVE,
      activationStatus: DRIVER_ACTIVATION_STATUS.READY,
      driverStatus: DRIVER_AVAILABILITY_STATUS.AVAILABLE,
    }).select('_id location');
  } catch (error) {
    console.error("Error finding nearby drivers:", error);
    return [];
  }
}
