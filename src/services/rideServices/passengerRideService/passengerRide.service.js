import { Ride } from "../../../models/ride/ride.model.js";
import { Driver } from "../../../models/driver/driver.model.js";
import { Passenger } from "../../../models/passenger/passenger.model.js";
import { calculateFare, calculateEarningsFromDistance } from "../../../helpers/rideHelpers.js";
import { areCoordinatesClose } from "../../../common/utlis.js";

// Service to create a new ride
export async function createRideService({ passengerId, pickup, drop, vehicleType }) {
  const fareDetails = calculateFare(pickup, drop, vehicleType);
  const { distanceInKm, totalFare } = fareDetails;

  function fourDigitNumber() {
    return Math.floor(1000 + Math.random() * 9000);
  }

  let otpForStartRide = fourDigitNumber();

  const ride = await Ride.create({
    passenger: passengerId,
    pickup: { address: pickup.address, coordinates: [pickup.lat, pickup.lng] },
    drop: { address: drop.address, coordinates: [drop.lat, drop.lng] },
    otpForStartRide,
    distance: distanceInKm,
    fareEstimate: totalFare,
    vehicleType: fareDetails.vehicleType,
  });

  await Passenger.findByIdAndUpdate(passengerId, {
    location: { type: "Point", coordinates: [pickup.lat, pickup.lng] },
    $inc: { "rideCount.created": 1 },
  });

  const nearbyDrivers = await Driver.find({
    status: "active",
    activationStatus: "ready",
    vehicleType: vehicleType,
    location: {
      $near: {
        $geometry: { type: "Point", coordinates: [pickup.lat, pickup.lng] },
        $maxDistance: 5000,
      },
    },
  });

  return { ride, nearbyDrivers };
}

// Service to update an existing ride
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
    ride.drop = {
      address: drop.address,
      coordinates: [drop.lat, drop.lng],
    };
  }

  const dropCoords = drop
    ? [drop.lat, drop.lng]
    : ride.drop?.coordinates;

  const pickupCoords = ride.pickup?.coordinates;

  if (
    Array.isArray(dropCoords) &&
    dropCoords.length === 2 &&
    Array.isArray(pickupCoords) &&
    pickupCoords.length === 2
  ) {
    const pickupPoint = {
      lat: pickupCoords[0],
      lng: pickupCoords[1],
    };

    const dropPoint = {
      lat: dropCoords[0],
      lng: dropCoords[1],
    };

    const fareDetails = calculateFare(
      pickupPoint,
      dropPoint,
      ride.vehicleType
    );

    ride.distance = fareDetails.distanceInKm;
    ride.fareEstimate = fareDetails.totalFare;
  }

  await ride.save();
  return ride;
}

// Service to cancel a ride
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

  if (ride.status === "ongoing") {
    throw new Error("Cannot cancel an ongoing ride");
  }

  if (ride.status === "cancelled") {
    throw new Error("Ride is already cancelled");
  }

  if (ride.status === "completed") {
    throw new Error("Cannot cancel a completed ride");
  }

  ride.status = "cancelled";
  await ride.save();

  await Passenger.findByIdAndUpdate(passengerId, {
    $inc: { "rideCount.cancelled": 1 },
  });
  return ride;
} 

// Service to end a ride for passenger (based on passenger's current location)
export async function endRideService({ rideId, passengerId, passengerLocationCoordinates }) {
  if (!rideId || !passengerId) {
    throw new Error("Ride ID and Passenger ID are required");
  }

  const ride = await Ride.findOne({ _id: rideId, passenger: passengerId });

  if (!ride) {
    throw new Error("Ride not found or unauthorized access");
  }

  // if (ride.status !== "ongoing") {
  //   throw new Error("Only ongoing rides can be ended");
  // }

  if (!passengerLocationCoordinates || passengerLocationCoordinates.length !== 2) {
    throw new Error("Passenger location is required to end the ride");
  }

  if (!ride.drop || !ride.drop.coordinates || ride.drop.coordinates.length !== 2) {
    throw new Error("Ride drop location is not available");
  }

  if (!areCoordinatesClose(passengerLocationCoordinates, ride.drop.coordinates)) {
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
        "rideCount.completed": 1,
        "earnings.totalEarnings": fare,
        "earnings.totalDriverPayout": driverShare,
        "earnings.totalPlatformFee": platformFee,
      },
    });
  }

  if (ride.passenger) {
    await Passenger.findByIdAndUpdate(ride.passenger, {
      $inc: { "rideCount.completed": 1},
    });
  }

  return ride;
} 

// Service for passenger to give feedback to driver
export async function giveDriverFeedbackService({ rideId, passengerId, rating, comment }) {
  const ride = await Ride.findById(rideId);

  if (!ride || !ride.passenger || ride.passenger.toString() !== passengerId.toString()) {
    throw new Error("Ride not found");
  }

  if (!ride.driver) {
    throw new Error("Driver not associated with this ride");
  }

  if (ride.status !== "completed") {
    throw new Error("Feedback can only be given for completed rides");
  }

  const existingFeedback = await Driver.findOne({
    _id: ride.driver,
    "feedbacks.ride": rideId,
    "feedbacks.passenger": passengerId,
  }).select("_id");

  if (existingFeedback) {
    throw new Error("Driver Feedback already submitted");
  }

  await Driver.findByIdAndUpdate(ride.driver, {
    $push: {
      feedbacks: {
        rating: Number(rating),
        comment,
        passenger: passengerId,
        ride: rideId,
      },
    },
  });

  return {
    rideId,
    driverId: ride.driver,
    rating: Number(rating),
    comment,
  };
}