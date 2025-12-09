import { Ride } from "../../../models/ride/ride.model.js";
import { areCoordinatesClose } from "../../../common/utlis.js";
import { getIO } from "../../../config/socket/socket.js";

// ----------------- Helper Function to emit Socket Events -----------------
const emitRideStatusUpdate = (ride, status) => {
  const io = getIO();
  if (io) {
    io.to(`ride_${ride._id}`).emit('rideStatusUpdate', {
      rideId: ride._id,
      status,
      driverLocation: ride.driverLocation,
      updatedAt: new Date()
    });
  }
};

//------------------------ Get Ride By ID ------------------------
export async function getRideByIdService(rideId, driverId) {
  const ride = await Ride.findById(rideId);

  if (!ride) {
    throw new Error("Ride not found");
  }
  if (ride.driver.toString() !== driverId.toString()) {

    throw new Error("You are not assigned to this ride");
  }
  return ride;
}

//------------------------ Get All Rides ------------------------
export async function getAllRidesForDriverService(driverId) {
  const rides = await Ride.find({ driver: driverId }).sort({ createdAt: -1 });
  return rides.map((ride) => ride);
}

//------------------------ Update Drivert Location ------------------------
export async function updateDriverLocationService(driver, lng, lat,  rideId = null) {
  if (!driver?._id) {
    throw new Error("Driver not found or unauthorized");
  }

  if (typeof lat !== "number" || typeof lng !== "number") {
    throw new Error("Latitude and longitude must be valid numbers");
  }

  // Update driver's location
  driver.longitude = lng;
  driver.latitude = lat;
  await driver.save();

  // If rideId is provided, check for ride status updates
  if (rideId) {
    const ride = await Ride.findOne({
      _id: rideId,
      driver: driver._id,
      status: { $in: ["accepted", "on_the_way", "driver_arrived"] }
    });

    if (ride) {
      // Ensure driver location is in [lng, lat] format (GeoJSON)
      const driverLocation = [lng, lat];
      
      // Only proceed if we have valid pickup coordinates
      if (ride.pickup?.coordinates?.length === 2) {
        // Ensure pickup coordinates are in [lng, lat] format
        const pickupCoords = ride.pickup.coordinates;
        
        console.log('Driver location (lng, lat):', driverLocation);
        console.log('Pickup location (lng, lat):', pickupCoords);
        
        const isNearPickup = areCoordinatesClose(driverLocation, pickupCoords);
        console.log('Is near pickup:', isNearPickup);
        console.log('Current ride status:', ride.status);
        
        // Update ride status based on proximity to pickup
        if (isNearPickup) {
          if (ride.status === "on_the_way" || ride.status === "accepted") {
            console.log('Updating status to driver_arrived');
            ride.status = "driver_arrived";
            await ride.save();
            emitRideStatusUpdate(ride, "driver_arrived");
          }
        } else if (ride.status === "accepted" || !isNearPickup) {
          console.log('Updating status to on_the_way');
          ride.status = "on_the_way";
          await ride.save();
          emitRideStatusUpdate(ride, "on_the_way");
        }
      }
    }
  }

  return {
    id: driver._id,
    name: driver.name,
    vehicleType: driver.vehicleType,
    vehicleNumber: driver.vehicleNumber,
    coordinates: [lng, lat],
    longitude: lng,
    latitude: lat,
    updatedAt: new Date(),
  };
}