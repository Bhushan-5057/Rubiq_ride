import { getIO } from "../config/socket/socket.js";
import { Driver } from "../models/driver/driver.model.js";
import { Ride } from "../models/ride/ride.model.js";

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
      isAvailable: true,
      isActive: true
    }).select('_id location');
  } catch (error) {
    console.error("Error finding nearby drivers:", error);
    return [];
  }
}