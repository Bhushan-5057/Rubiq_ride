
import { Ride } from "../../../models/ride/ride.model.js";
import { Driver } from "../../../models/driver/driver.model.js";
import { getDistanceMatrix } from "../../googleMaps/googleMaps.service.js";

//------------------------ Get Ride Status ------------------------
export async function getRideStatusService({ rideId, passengerId }) {
  const ride = await Ride.findOne({ _id: rideId, passenger: passengerId }).lean();

  if (!ride) throw new Error("Ride not found or unauthorized access");

  if (ride.status === "completed") {
    const driver = await Driver.findById(ride.driver).lean();

    return {
      rideId: ride._id,
      status: ride.status,
      fareEstimate: ride.fareEstimate,
      pickup: ride.pickup,
      drop: ride.drop,
      driver: driver
        ? {
          id: driver._id,
          name: driver.name,
          vehicleNumber: driver.vehicleNumber,
          vehicleType: driver.vehicleType,
          contactNumber: driver.contactNumber,
        }
        : null,
      createdAt: ride.createdAt,
      updatedAt: ride.updatedAt,
    };
  }

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
  let etaToPickupMinutes = null;
  if (driver.location.coordinates?.length === 2 && ride.pickup?.coordinates?.length === 2) {
    try {
      const matrix = await getDistanceMatrix({
        origins: [driver.location.coordinates],
        destinations: [ride.pickup.coordinates],
      });
      const element = matrix.rows[0]?.elements[0];
      distanceFromPickup = element?.distance?.text || "N/A";
      etaToPickupMinutes = element?.durationInTraffic?.minutes || element?.duration?.minutes || null;
    } catch (error) {
      distanceFromPickup = "N/A";
    }

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
    etaToPickupMinutes,
  };
}

//------------------------ Get All Rides ------------------------
export async function getPassengerAllRideService(passengerId) {
  if (!passengerId) throw new Error("Passenger ID is required");

  const rides = await Ride.find({ passenger: passengerId })
    .populate("driver", "name vehicleNumber vehicleType contactNumber")
    .sort({ createdAt: -1 });

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

//--------------------- Get Passenger Ride By Id ---------------------

export async function getPassengerRideByIdService(rideId, passengerId) {
  const ride = await Ride.findById(rideId)
    .populate({
      path: "driver",
      select: "name contactNumber vehicleNumber vehicleType"
    })
  if (!ride) {
    throw new Error("Ride not Found")
  }
  if (ride.passenger.toString() !== passengerId.toString()) {
    throw new Error("You Have Not Created This Ride")
  }
  return ride
}
