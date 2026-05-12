import { Ride } from "../../../models/ride/ride.model.js";
import { Driver } from "../../../models/driver/driver.model.js";
import { Passenger } from "../../../models/passenger/passenger.model.js";
import { calculateFareFromDistance, calculateEarningsFromDistance } from "../../../helpers/rideHelpers.js";
import { areCoordinatesClose } from "../../../common/utlis.js";
import { addRideTimeoutJob } from "../../../queues/rideTimeout.queue.js";
import { PASSENGER_CANCELLATION_REASONS, PASSENGER_REASON_CODES } from "../../../common/cancellationReasons.js"
import {
  getDriverEtasToDestination,
  getPrimaryRoute,
  resolveRideLocation,
} from "../../googleMaps/googleMaps.service.js";


//--------------- Update Passengers Location ---------------

export async function updatePassengerLocationService(passenger, lng, lat) {
  if (!passenger?._id) {
    throw new Error("Passenger not found or unauthorized");
  }

  if (typeof lng !== "number" || typeof lat !== "number") {
    throw new Error("Latitude and longitude must be valid numbers");
  }

  const currentTime = new Date();

  passenger.location = {
    type: "Point",
    coordinates: [lng, lat],
  };

  await passenger.save();

  return {
    id: passenger._id,
    name: passenger.name,
    coordinates: [lng, lat],
    longitude: lng,
    latitude: lat,
    updatedAt: currentTime,
    dbSaved: true,
  };
}

//-------------------- Create Ride --------------------

export async function createRideService({ passengerId, pickup, drop, vehicleType, paymentMethod, isPaymentRequiredBeforeRide }) {
  const [resolvedPickup, resolvedDrop] = await Promise.all([
    resolveRideLocation(pickup, "pickup"),
    resolveRideLocation(drop, "drop"),
  ]);
  const route = await getPrimaryRoute({
    origin: resolvedPickup.coordinates,
    destination: resolvedDrop.coordinates,
  });
  const fareDetails = calculateFareFromDistance(route.distance.km, vehicleType);
  const { distanceInKm, totalFare } = fareDetails;

  function fourDigitNumber() {
    return Math.floor(1000 + Math.random() * 9000);
  }

  let otpForStartRide = fourDigitNumber();

  const ride = await Ride.create({
    passenger: passengerId,
    pickup: {
      address: resolvedPickup.address,
      coordinates: resolvedPickup.coordinates,
      placeId: resolvedPickup.placeId,
    },
    drop: {
      address: resolvedDrop.address,
      coordinates: resolvedDrop.coordinates,
      placeId: resolvedDrop.placeId,
    },
    otpForStartRide,
    distance: distanceInKm,
    fareEstimate: totalFare,
    routeDetails: {
      distanceMeters: route.distance.meters,
      durationSeconds: route.duration.seconds,
      durationInTrafficSeconds: route.durationInTraffic.seconds,
      polyline: route.polyline,
      summary: route.summary,
      bounds: route.bounds,
      legs: route.legs,
    },
    vehicleType: fareDetails.vehicleType,
    paymentMethod,
    isPaymentRequiredBeforeRide: paymentMethod !== 'cash',
  });

  await ride.populate({
    path: "passenger",
    select: "name contactNumber rating"
  });

  const nearbyDrivers = await Driver.find({
    status: "active",
    activationStatus: "ready",
    vehicleType: vehicleType,
    isOnline:true,
    driverStatus: "available",
    location: {
      $near: {
        $geometry: { type: "Point", coordinates: resolvedPickup.coordinates },
        $maxDistance: 5000,
      },
    },
  }).select("_id location");

  let driverEtas = [];
  try {
    driverEtas = await getDriverEtasToDestination(nearbyDrivers, resolvedPickup.coordinates);
  } catch (error) {
    console.error("Unable to calculate nearby driver ETAs:", error.message);
  }

  ride.notifiedDrivers = nearbyDrivers.map(d => d._id);
  await ride.save();

  await addRideTimeoutJob(ride._id.toString(), 60000);

  await Passenger.findByIdAndUpdate(passengerId, {
    location: { type: "Point", coordinates: resolvedPickup.coordinates },
  });

  return { ride, nearbyDrivers, driverEtas };
}

//-------------------- Update Ride --------------------

export async function updateRideService({ rideId, passengerId, drop }) {
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
    const resolvedDrop = await resolveRideLocation(drop, "drop");
    ride.drop = {
      address: resolvedDrop.address,
      coordinates: resolvedDrop.coordinates,
      placeId: resolvedDrop.placeId,
    };
  }

  const dropCoords = ride.drop?.coordinates;

  const pickupCoords = ride.pickup?.coordinates;

  if (
    Array.isArray(dropCoords) &&
    dropCoords.length === 2 &&
    Array.isArray(pickupCoords) &&
    pickupCoords.length === 2
  ) {
    const route = await getPrimaryRoute({
      origin: pickupCoords,
      destination: dropCoords,
    });
    const fareDetails = calculateFareFromDistance(route.distance.km, ride.vehicleType);

    ride.distance = fareDetails.distanceInKm;
    ride.fareEstimate = fareDetails.totalFare;
    ride.routeDetails = {
      distanceMeters: route.distance.meters,
      durationSeconds: route.duration.seconds,
      durationInTrafficSeconds: route.durationInTraffic.seconds,
      polyline: route.polyline,
      summary: route.summary,
      bounds: route.bounds,
      legs: route.legs,
    };
  }

  await ride.save();
  return ride;
}

//-------------------- Cancel Ride --------------------

export async function cancelRideService({ passengerId, rideId, reasonCode, reasonText, }) {

  const ride = await Ride.findById(rideId);

  if (!ride) {
    throw new Error("Ride not found");
  }

  if (ride.passenger.toString() !== passengerId.toString()) {
    throw new Error("You are not authorized to cancel this ride");
  }

  if (["ongoing", "completed", "cancelled"].includes(ride.status)) {
    throw new Error(`Cannot cancel the ride with status ${ride.status}`)
  }

  if (!PASSENGER_REASON_CODES.includes(reasonCode)) {
    throw new Error("Invalid cancellation reason");
  }

  let finalReasonText;
  if (reasonCode === "OTHER") {
    if (!reasonText || !reasonText.trim()) {
      throw new Error("Reason text is required for Other")
    }
    finalReasonText = reasonText.trim()
  } else {
    finalReasonText = PASSENGER_CANCELLATION_REASONS[reasonCode]
  }

  ride.status = "cancelled";
  ride.cancellation = {
    cancelledBy: "Passenger",
    reasonCode,
    reasonText: finalReasonText,
    cancelledAt: new Date()
  }
  await ride.save();
  return ride;
}

//-------------------- End Ride --------------------

export async function endRideService({ rideId, passengerId, passengerLocationCoordinates }) {
  if (!rideId || !passengerId) {
    throw new Error("Ride ID and Passenger ID are required");
  }

  const ride = await Ride.findOne({ _id: rideId, passenger: passengerId });

  if (!ride) {
    throw new Error("Ride not found or unauthorized access");
  }


  if (!passengerLocationCoordinates || passengerLocationCoordinates.length !== 2) {
    throw new Error("Passenger location is required to end the ride");
  }

  if (!ride.drop || !ride.drop.coordinates || ride.drop.coordinates.length !== 2) {
    throw new Error("Ride drop location is not available");
  }

  // Convert passenger location to [lng, lat] for comparison
  const passengerLocation = [
    passengerLocationCoordinates[0],
    passengerLocationCoordinates[1]
  ];

  if (!areCoordinatesClose(passengerLocation, ride.drop.coordinates)) {
    throw new Error("Passenger is not at the drop location");
  }

  ride.status = "completed";
  ride.completedAt = new Date();

  await ride.save();

  if (ride.driver) {
    const fare = ride.fareEstimate || 0;
    let driverShare = 0;
    let platformFee = 0;
    if (ride.distance && ride.vehicleType) {
      const { platformFee: pf, driverShare: ds } = calculateEarningsFromDistance(
        ride.distance,
        ride.vehicleType
      );
      driverShare = ds || 0;
      platformFee = pf || 0;
    }
    await Driver.findByIdAndUpdate(ride.driver, {
      $inc: {
        "earnings.totalEarnings": fare,
        "earnings.totalDriverPayout": driverShare,
        "earnings.totalPlatformFee": platformFee,
      },
    });
  }

  if (ride.passenger) {
    await Passenger.findByIdAndUpdate(ride.passenger, {
    });
  }

  return ride;
}



