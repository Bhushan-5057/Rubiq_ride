import { Ride } from "../../../../models/ride/ride.model.js";
import { getDistance } from "geolib";
import { Driver } from "../../../../models/driver/driver.model.js";
import { Passenger } from "../../../../models/passengers/passenger.model.js";



export async function createRideService({ passengerId, pickup, drop }) {
  const distanceInKm = getDistance(
    { latitude: pickup.lat, longitude: pickup.lng },
    { latitude: drop.lat, longitude: drop.lng }
  ) / 1000;

  const fareEstimate = Math.round(50 + distanceInKm * 10); 

  function fourDigitNumber() {
    return Math.floor(1000 + Math.random() * 9000);
  }

  let otpForStartRide = fourDigitNumber();

  const ride = await Ride.create({
    passenger: passengerId,
    pickup: { address: pickup.address, coordinates: [pickup.lng, pickup.lat] },
    drop: { address: drop.address, coordinates: [drop.lng, drop.lat] },
    otpForStartRide,
    distance: distanceInKm,
    fareEstimate,
  });

  await Passenger.findByIdAndUpdate(passengerId, {
    location: { type: "Point", coordinates: [pickup.lng, pickup.lat] },
  });

  const nearbyDrivers = await Driver.find({
    status: "active",
    location: {
      $near: {
        $geometry: { type: "Point", coordinates: [pickup.lng, pickup.lat] },
        $maxDistance: 5000,
      },
    },
  });

  return { ride, nearbyDrivers };
}

export async function updateRideService({ rideId, passengerId,drop }) {
  if (!rideId || !passengerId) {
    throw new Error("Ride ID and Passenger ID are required");
  }

  const ride = await Ride.findOne({ _id: rideId, passenger: passengerId });

  if (!ride) {
    throw new Error("Ride not found or unauthorized access");
  }

  if (ride.status === "cancelled") {
    throw new Error("Cannot update a cancelled ride");
  }

  if (ride.status === "completed") {
    throw new Error("Cannot update a completed ride");
  }

  if (!drop) {
    throw new Error("Nothing to update. Provide pickup and/or drop details");
  }

  if (drop) {
    ride.drop = {
      address: drop.address,
      coordinates: [drop.lng, drop.lat],
    };
  }

  const dropCoords = drop
    ? [drop.lng, drop.lat]
    : ride.drop?.coordinates;

  const pickupCoords = ride.pickup?.coordinates;

  if (
    Array.isArray(dropCoords) &&
    dropCoords.length === 2 &&
    Array.isArray(pickupCoords) &&
    pickupCoords.length === 2
  ) {
    const distanceInKm =
      getDistance(
        { latitude: pickupCoords[1], longitude: pickupCoords[0] },
        { latitude: dropCoords[1], longitude: dropCoords[0] }
      ) / 1000;

    const fareEstimate = Math.round(50 + distanceInKm * 10);

    ride.distance = distanceInKm;
    ride.fareEstimate = fareEstimate;
  }

  await ride.save();
  return ride;
}

export async function cancelRideService(passengerId, rideId) {
  if (!passengerId || !rideId) {
    throw new Error("Passenger ID and Ride ID are required");
  }

  const ride = await Ride.findById(rideId);

  if (!ride) {
    throw new Error("Ride not found");
  }

  if (ride.passenger.toString() !== passengerId.toString()) {
    throw new Error("You are not authorized to cancel this ride");
  }

  if (ride.status === "cancelled") {
    throw new Error("Ride is already cancelled");
  }

  if (ride.status === "completed") {
    throw new Error("Cannot cancel a completed ride");
  }

  ride.status = "cancelled";
  await ride.save();
  return ride;
}
