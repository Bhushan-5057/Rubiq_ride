import { Ride } from "../../../models/ride/ride.model.js";
import { Driver } from "../../../models/driver/driver.model.js";
import { areCoordinatesClose } from "../../../common/utlis.js";
import { calculateEarningsFromDistance } from "../../../helpers/rideHelpers.js";
import { rideTimeoutQueue } from "../../../queues/rideTimeout.queue.js";
import {DRIVER_CANCELLATION_REASONS,DRIVER_REASON_CODES} from "../../../common/cancellationReasons.js"

//-------------------- Accept Ride --------------------

export async function acceptRideService({ rideId, driverId }) {
  const ride = await Ride.findOneAndUpdate(
    { _id: rideId, status: "pending" },
    { driver: driverId, status: "accepted", acceptedAt: new Date() },
    { new: true }
  );

  if (!ride) throw new Error("Ride not available or already accepted");

  const jobs = await rideTimeoutQueue.getDelayed();
  for (const job of jobs) {
    if (job.data.rideId.toString() === rideId.toString()) {
      await job.remove();
    }
  }
  const driverStatus = await Driver.findById(driverId).select("driverStatus");
  if (driverStatus) {
    driverStatus.driverStatus = "on_trip";
    await driverStatus.save();
  }
  return ride;
}

//-------------------- Driver Arrived --------------------

export async function driverArrivedService({ rideId, driverId, driverLocationCoordinates }) {

  const ride = await Ride.findById(rideId);

  if (!ride) {
    throw new Error("Ride not found");
  }

  if (!ride.driver || ride.driver.toString() !== driverId.toString()) {
    throw new Error("You are not assigned to this ride");
  }

  if (ride.status !== "accepted") {
    throw new Error(`Driver can only arrive when ride status is accepted, current status: ${ride.status}`);
  }

  if (!driverLocationCoordinates || driverLocationCoordinates.length !== 2) {
    throw new Error("Driver location is required to mark arrival");
  }

  if (!ride.pickup || !ride.pickup.coordinates || ride.pickup.coordinates.length !== 2) {
    throw new Error("Ride pickup location is not available");
  }

  // Convert driver location to [lng, lat] for comparison
  const driverLocation = [
    driverLocationCoordinates[0],
    driverLocationCoordinates[1]
  ];

  if (!areCoordinatesClose(driverLocation, ride.pickup.coordinates)) {
    throw new Error("Driver is not at the passenger pickup location");
  }

  ride.arrivedAt = new Date();
  await ride.save();

  return ride;
}

//-------------------- Start Ride --------------------

export async function startRideService({ rideId, driverId, otpForStartRide, driverLocationCoordinates }) {

  const ride = await Ride.findById(rideId);

  if (!ride) {
    throw new Error("Ride not found");
  }

  if (!ride.driver || ride.driver.toString() !== driverId.toString()) {
    throw new Error("You are not assigned to this ride");
  }

  if (ride.status !== "driver_arrived") {
    throw new Error(`Ride cannot be started in current status: ${ride.status}`);
  }

  if (!driverLocationCoordinates || driverLocationCoordinates.length !== 2) {
    throw new Error("Driver location is required to start the ride");
  }

  if (!ride.pickup || !ride.pickup.coordinates || ride.pickup.coordinates.length !== 2) {
    throw new Error("Ride pickup location is not available");
  }

  // Convert driver location to [lng, lat] for comparison
  const driverLocation = [
    driverLocationCoordinates[0],
    driverLocationCoordinates[1]
  ];

  console.log(driverLocation)

  if (!areCoordinatesClose(driverLocation, ride.pickup.coordinates)) {
    throw new Error("Driver is not at the passenger pickup location");
  }

  const incomingOtp = Number(otpForStartRide);
  if (ride.otpForStartRide !== incomingOtp) {
    throw new Error("Invalid OTP");
  }

  ride.status = "ongoing";

  ride.startedAt = new Date();
  await ride.save();

  return ride;
}

//-------------------- Complete Ride --------------------

export async function completeRideService({ rideId, driverId, driverLocationCoordinates }) {
  const ride = await Ride.findById(rideId);

  if (!ride) {
    throw new Error("Ride not found");
  }

  if (!ride.driver || ride.driver.toString() !== driverId.toString()) {
    throw new Error("You are not assigned to this ride");
  }

  if (ride.status !== "ongoing") {
    throw new Error(`Ride cannot be completed in current status: ${ride.status}`);
  }

  if (!driverLocationCoordinates || driverLocationCoordinates.length !== 2) {
    throw new Error("Driver location is required to complete the ride");
  }

  if (!ride.drop || !ride.drop.coordinates || ride.drop.coordinates.length !== 2) {
    throw new Error("Ride drop location is not available");
  }

  // Convert driver location to [lng, lat] for comparison
  const driverLocation = [
    driverLocationCoordinates[0],
    driverLocationCoordinates[1]
  ];

  if (!areCoordinatesClose(driverLocation, ride.drop.coordinates)) {
    throw new Error("Driver is not at the passenger drop location");
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

  return ride;
}

//-------------------- Cancel Ride --------------------

export async function cancelRideService({ rideId, driverId,reasonCode,reasonText }) {
  const ride = await Ride.findOne({
    _id: rideId,
    driver: driverId,
    status: { $in: ["accepted", "pending"] }
  });

  if (!ride) {
    throw new Error("Ride not found or cannot be cancelled");
  }

  if (!DRIVER_REASON_CODES.includes(reasonCode)) {
    throw new Error("Invalid cancellation reason");
  }

  let finalReasonText;

  if (reasonCode === "OTHER") {
    if (!reasonText) {
      throw new Error("Reason text is required for OTHER");
    }
    finalReasonText = reasonText.trim();
  } else {
    finalReasonText = DRIVER_CANCELLATION_REASONS[reasonCode];
  }

  ride.status = "cancelled";
  ride.cancellation = {
    cancelledBy: "Driver",
    reasonCode,
    reasonText: finalReasonText,
    cancelledAt: new Date()
  };

  await ride.save();
  return ride;
}

//------------------------ Update Driver Location with Throttling------------------------

export async function updateDriverLocationService(driver, lng, lat) {
  if (!driver?._id) {
    throw new Error("Driver not found or unauthorized");
  }

  if (typeof lng !== "number" || typeof lat !== "number") {
    throw new Error("Latitude and longitude must be valid numbers");
  }

  const THROTTLE_INTERVAL = 5; 
  const currentTime = new Date();
  const lastUpdateTime = driver.lastLocationUpdateTime ? new Date(driver.lastLocationUpdateTime) : null;
  
  const shouldUpdateDB = !lastUpdateTime || (currentTime - lastUpdateTime) / 1000 >= THROTTLE_INTERVAL;

  driver.longitude = lng;
  driver.latitude = lat;
  driver.lastOnline = currentTime;

  if (shouldUpdateDB) {
    driver.lastLocationUpdateTime = currentTime;
    await driver.save(); 
  }

  return {
    id: driver._id,
    name: driver.name,
    vehicleType: driver.vehicleType,
    vehicleNumber: driver.vehicleNumber,
    coordinates: [lng, lat],
    longitude: lng,
    latitude: lat,
    updatedAt: currentTime,
    dbSaved: shouldUpdateDB, 
    status: driver.driverStatus,
    lastOnlineTime: driver.lastOnline,
  };
}