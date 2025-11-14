
import { getDistance } from "geolib";
import { Ride } from "../../../../../models/ride/ride.model.js";
import { Driver } from "../../../../../models/driver/Driver.model.js";
import { io } from "../../../../../server.js";

export async function getRideStatusService({ rideId, passengerId }) {
  const ride = await Ride.findOne({ _id: rideId, passenger: passengerId }).lean();

  if (!ride) throw new Error("Ride not found or unauthorized access");

  if (ride.status !== "accepted" && ride.status !== "ongoing") {
    return {
      rideId: ride._id,
      status: ride.status,
      driver: null,
      distanceFromPickup: "N/A",
    };
  }

  const driver = await Driver.findById(ride.driver).lean();
  if (!driver || !driver.location || !driver.location.coordinates) {
    return {
      rideId: ride._id,
      status: ride.status,
      driver: null,
      distanceFromPickup: "N/A",
    };
  }

  let distanceFromPickup = "N/A";
  if (
    driver.location.coordinates?.length === 2 &&
    ride.pickup?.coordinates?.length === 2
  ) {
    const distance = getDistance(
      {
        latitude: ride.pickup.coordinates[1],
        longitude: ride.pickup.coordinates[0],
      },
      {
        latitude: driver.location.coordinates[1],
        longitude: driver.location.coordinates[0],
      }
    );
    distanceFromPickup = distance < 50 ? "< 0.05 km" : (distance / 1000).toFixed(2) + " km";

  }

  return {
    rideId: ride._id,
    status: ride.status,
    driver: {
      id: driver._id,
      name: driver.name,
      vehicleNumber: driver.vehicleNumber,
      vehicleType: driver.vehicleType,
      coordinates: driver.location.coordinates,
    },
    distanceFromPickup,
  };
}


//get all rides for passenger

export async function getPassengerRidesService(passengerId) {
  if (!passengerId) throw new Error("Passenger ID is required");

  const rides = await Ride.find({ passenger: passengerId })
    .populate("driver", "name vehicleNumber vehicleType contactNumber")
    .sort({ createdAt: -1 });

  // Optionally, emit an event notifying passenger that their rides were fetched
  io.to(passengerId.toString()).emit("ridesFetched", rides);

  return rides.map((ride) => ({
    rideId: ride._id,
    status: ride.status,
    fareEstimate: ride.fareEstimate,
    pickup: ride.pickup,
    drop: ride.drop,
    driver: ride.driver
      ? {
          id: ride.driver._id,
          name: ride.driver.name,
          vehicleNumber: ride.driver.vehicleNumber,
          vehicleType: ride.driver.vehicleType,
          contactNumber: ride.driver.contactNumber,
        }
      : null,
    createdAt: ride.createdAt,
    updatedAt: ride.updatedAt,
  }));
}