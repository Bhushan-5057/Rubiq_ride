import { Ride } from "../../../../models/ride/ride.model.js";

//service to get ride by id for driver
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

//service to get all rides for driver
export async function getAllRidesForDriverService(driverId) {
  const rides = await Ride.find({ driver: driverId }).sort({ createdAt: -1 });
  return rides.map((ride) => ride);
}

//service to update driver location
export async function updateDriverLocationService(driver, lat, lng) {

  if (!driver?._id) {
    throw new Error("Driver not found or unauthorized");
  }

  if (typeof lat !== "number" || typeof lng !== "number") {
    throw new Error("Latitude and longitude must be valid numbers");
  }

  driver.latitude = lat;
  driver.longitude = lng;

  await driver.save();

  return {
    id: driver._id,
    name: driver.name,
    vehicleType: driver.vehicleType,
    vehicleNumber: driver.vehicleNumber,
    coordinates: driver.location?.coordinates,
    latitude: driver.latitude,
    longitude: driver.longitude,
    updatedAt: driver.updatedAt,
  };
} 


