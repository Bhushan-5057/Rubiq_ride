import { Ride } from "../../../../../models/ride/ride.model.js";

export async function getSingleRideService(rideId) {
  console.log("Ride ID in service:", rideId);
  if (!rideId) throw new Error("Ride ID is required");
  const ride = await Ride.findById(rideId)
    .populate("passenger", "name contactNumber email")
    .populate("driver", "name vehicleNumber vehicleType contactNumber");

  if (!ride) throw new Error("Ride not found");

  return {
    rideId: ride._id,
    status: ride.status,
    fareEstimate: ride.fareEstimate,
    distance: ride.distance,
    pickup: ride.pickup,
    drop: ride.drop,
    passenger: ride.passenger ? {
      id: ride.passenger._id,
      name: ride.passenger.name,
      contactNumber: ride.passenger.contactNumber,
      email: ride.passenger.email,
    } : null,
    driver: ride.driver ? {
      id: ride.driver._id,  
      name: ride.driver.name,
      vehicleNumber: ride.driver.vehicleNumber,
      vehicleType: ride.driver.vehicleType,
      contactNumber: ride.driver.contactNumber,
    } : null,
    createdAt: ride.createdAt,
    updatedAt: ride.updatedAt,
  };
}

export async function getAllRidesService() {
  const rides = await Ride.find()
    .populate("passenger", "name contactNumber email")
    .populate("driver", "name vehicleNumber vehicleType contactNumber")
    .sort({ createdAt: -1 }); 

  return rides.map((ride) => ({
    rideId: ride._id,
    status: ride.status,
    fareEstimate: ride.fareEstimate,
    distance: ride.distance,
    pickup: ride.pickup,
    drop: ride.drop,
    passenger: ride.passenger ? {
      id: ride.passenger._id,
      name: ride.passenger.name,
      contactNumber: ride.passenger.contactNumber,
      email: ride.passenger.email,
    } : null,
    driver: ride.driver ? {
      id: ride.driver._id,
      name: ride.driver.name,
      vehicleNumber: ride.driver.vehicleNumber,
      vehicleType: ride.driver.vehicleType,
      contactNumber: ride.driver.contactNumber,
    } : null,
    createdAt: ride.createdAt,
    updatedAt: ride.updatedAt,
  }));
}


//delete ride service
export async function deleteRideService(rideId) {
  const ride = await Ride.findById(rideId);
  if (!ride) throw new Error("Ride not found");
  await ride.deleteOne();
  return true;
}

//delete all rides service
export async function deleteAllRidesService() {
  const result = await Ride.deleteMany({}); 
  return result.deletedCount; 
}