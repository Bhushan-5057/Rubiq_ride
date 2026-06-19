import { Ride } from "../../../models/ride/ride.model.js";

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