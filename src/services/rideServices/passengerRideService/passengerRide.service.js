import { Ride } from "../../../models/ride/ride.model.js";
import { Driver } from "../../../models/driver/driver.model.js";
import { Passenger } from "../../../models/passenger/passenger.model.js";
import {
  calculateFareFromDistance,
  calculateEarningsFromDistance,
} from "../../../helpers/rideHelpers.js";
import { areCoordinatesClose } from "../../../common/utils.js";
import { addRideTimeoutJob } from "../../../queues/rideTimeout.queue.js";
import {
  DRIVER_AVAILABILITY_STATUS,
  USER_STATUS,
} from "../../../constants/userStatus.constants.js";
import { canPassengerBookRide } from "../../../helpers/passengerStatus.helper.js";
import { findNearbyDrivers } from "../../../helpers/nearbyDrivers.helper.js";
import {
  applyLocationToDocument,
  buildLocationSetPayload,
  normalizeLocationInput,
} from "../../../utils/location.js";
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

  const currentTime = new Date();
  const payload = applyLocationToDocument(passenger, lng, lat, {
    updatedAt: currentTime,
  });

  await passenger.save();

  return {
    id: passenger._id,
    name: passenger.name,
    coordinates: payload.coordinates || [payload.longitude, payload.latitude],
    longitude: payload.longitude,
    latitude: payload.latitude,
    location: payload.location,
    updatedAt: currentTime,
    dbSaved: true,
  };
}

//-------------------- Create Ride --------------------

export async function createRideService({
  passengerId,
  pickup,
  drop,
  vehicleType,
  paymentMethod,
  isPaymentRequiredBeforeRide,
}) {

  const passenger = await Passenger.findById(passengerId).select(
    "status profileCompleted",
  );
  if (!passenger) {
    throw new Error("Passenger not found or inactive");
  }
  if (passenger.status === USER_STATUS.BLOCKED) {
    throw new Error("Blocked passengers cannot book rides");
  }
  if (!canPassengerBookRide(passenger)) {
    throw new Error("Passenger account is not active or profile is incomplete");
  }

  const [resolvedPickup, resolvedDrop] = await Promise.all([
    resolveRideLocation(pickup, "pickup"),
    resolveRideLocation(drop, "drop"),
  ]);
  const route = await getPrimaryRoute({
    origin: resolvedPickup.coordinates,
    destination: resolvedDrop.coordinates,
  });
  const fareDetails = await calculateFareFromDistance(
    route.distance.km,
    vehicleType,
  );
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
    fareEstimate: fareDetails.totalFare,

    fare: {
      total: fareDetails.totalFare,
      baseFare: fareDetails.baseFare,
      platformFee: fareDetails.platformFee,
      driverShare: fareDetails.driverShare,
    },
    routeDetails: {
      distanceMeters: route.distance.meters,
      durationSeconds: route.duration.seconds,
      durationInTrafficSeconds: route.durationInTraffic.seconds,
      polyline: route.polyline,
      summary: route.summary,
      bounds: route.bounds,
      legs: route.legs,
    },
    vehicleType: vehicleType,
    paymentMethod,
    isPaymentRequiredBeforeRide: paymentMethod !== "cash",
  });

  await ride.populate({
    path: "passenger",
    select: "name contactNumber rating",
  });

  const nearbyDrivers = await findNearbyDrivers(resolvedPickup.coordinates, {
    vehicleType,
  });

  console.log(
    `Found ${nearbyDrivers.length} nearby drivers for new ride ${ride._id}`,
  );

  let driverEtas = [];
  try {
    driverEtas = await getDriverEtasToDestination(
      nearbyDrivers,
      resolvedPickup.coordinates,
    );
  } catch (error) {
    console.error("Unable to calculate nearby driver ETAs:", error.message);
  }

  ride.notifiedDrivers = nearbyDrivers.map((d) => d._id);
  await ride.save();

  await addRideTimeoutJob(ride._id.toString(), 60000);

  const { coordinates: _coords, ...pickupLocationPayload } =
    buildLocationSetPayload(resolvedPickup.coordinates);
  await Passenger.findByIdAndUpdate(passengerId, {
    $set: pickupLocationPayload,
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
    const fareDetails = await calculateFareFromDistance(
      route.distance.km,
      ride.vehicleType,
    );

    ride.distance = fareDetails.distanceInKm;
    ride.fareEstimate = fareDetails.totalFare;

    ride.fare = {
      total: fareDetails.totalFare,
      baseFare: fareDetails.baseFare,
      platformFee: fareDetails.platformFee,
      driverShare: fareDetails.driverShare,
    };
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
  await ride.populate({
    path: "passenger",
    select: "name contactNumber rating",
  });
  return ride;
}

//-------------------- End Ride --------------------

export async function endRideService({
  rideId,
  passengerId,
  passengerLocationCoordinates,
}) {
  if (!rideId || !passengerId) {
    throw new Error("Ride ID and Passenger ID are required");
  }

  const ride = await Ride.findOne({ _id: rideId, passenger: passengerId });

  if (!ride) {
    throw new Error("Ride not found or unauthorized access");
  }

  if (
    !passengerLocationCoordinates ||
    passengerLocationCoordinates.length !== 2
  ) {
    throw new Error("Passenger location is required to end the ride");
  }

  if (
    !ride.drop ||
    !ride.drop.coordinates ||
    ride.drop.coordinates.length !== 2
  ) {
    throw new Error("Ride drop location is not available");
  }

  // Convert passenger location to [lng, lat] for comparison.
  // Clients may send [lat, lng]; resolve against stored drop [lng, lat].
  const passengerLocation = normalizeLocationInput(
    passengerLocationCoordinates,
    { referenceCoordinates: ride.drop.coordinates },
  ).coordinates;

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
      const { platformFee: pf, driverShare: ds } =
        await calculateEarningsFromDistance(ride.distance, ride.vehicleType);
      driverShare = ds || 0;
      platformFee = pf || 0;
    }
    await Driver.findByIdAndUpdate(ride.driver, {
      $set: {
        driverStatus: DRIVER_AVAILABILITY_STATUS.AVAILABLE,
        currentRide: null,
        lastRideCompletedAt: new Date(),
      },
      $inc: {
        "earnings.totalEarnings": fare,
        "earnings.totalDriverPayout": driverShare,
        "earnings.totalPlatformFee": platformFee,
      },
    });
  }

  if (ride.passenger) {
    await Passenger.findByIdAndUpdate(ride.passenger, {});
  }

  return ride;
}
