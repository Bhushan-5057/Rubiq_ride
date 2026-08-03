import { Ride } from "../../../models/ride/ride.model.js";
import { Driver } from "../../../models/driver/driver.model.js";
import { areCoordinatesClose } from "../../../common/utils.js";
import { calculateEarningsFromDistance } from "../../../helpers/rideHelpers.js";
import { removeRideTimeoutJob } from "../../../queues/rideTimeout.queue.js";
import { DRIVER_AVAILABILITY_STATUS } from "../../../constants/userStatus.constants.js";
import {
  canDriverAcceptRide,
  driverRideEligibilityQuery,
} from "../../../helpers/driverStatus.helper.js";
import {
  applyLocationToDocument,
  LOCATION_THROTTLE_SECONDS,
  normalizeLocationInput,
} from "../../../utils/location.js";
import { incrementPassengerRideStat } from "../../../helpers/rideStatsCounters.helper.js";

//-------------------- Accept Ride --------------------

export async function acceptRideService({ rideId, driverId }) {
  const eligibleDriver = await Driver.findOne(
    driverRideEligibilityQuery({ _id: driverId }),
  );

  if (!eligibleDriver || !canDriverAcceptRide(eligibleDriver)) {
    throw new Error("Driver is not eligible to accept rides");
  }

  // Only the driver currently holding the sequential offer may accept.
  const ride = await Ride.findOneAndUpdate(
    {
      _id: rideId,
      status: "pending",
      currentOfferedDriver: driverId,
    },
    {
      driver: driverId,
      status: "accepted",
      acceptedAt: new Date(),
      currentOfferedDriver: null,
      skippedDrivers: [],
    },
    { new: true },
  );

  if (!ride) {
    throw new Error(
      "Ride not available, already accepted, or not offered to this driver",
    );
  }

  await removeRideTimeoutJob(rideId);

  const driverStatus = await Driver.findById(driverId).select(
    "driverStatus currentRide",
  );

  if (driverStatus) {
    driverStatus.driverStatus = DRIVER_AVAILABILITY_STATUS.ON_TRIP;
    driverStatus.currentRide = ride._id;
    await driverStatus.save();
  }
  return ride;
}

//-------------------- Driver Arrived --------------------

export async function driverArrivedService({
  rideId,
  driverId,
  driverLocationCoordinates,
}) {
  const ride = await Ride.findById(rideId);

  if (!ride) {
    throw new Error("Ride not found");
  }

  if (!ride.driver || ride.driver.toString() !== driverId.toString()) {
    throw new Error("You are not assigned to this ride");
  }

  if (ride.status !== "accepted") {
    throw new Error(
      `Driver can only arrive when ride status is accepted, current status: ${ride.status}`,
    );
  }

  if (
    !ride.pickup ||
    !ride.pickup.coordinates ||
    ride.pickup.coordinates.length !== 2
  ) {
    throw new Error("Ride pickup location is not available");
  }

  // Canonical DB order is [lng, lat]. Clients often send [lat, lng];
  // resolve against pickup so both orders work.
  const driverLocation = normalizeLocationInput(driverLocationCoordinates, {
    referenceCoordinates: ride.pickup.coordinates,
  }).coordinates;

  if (!areCoordinatesClose(driverLocation, ride.pickup.coordinates)) {
    throw new Error("Driver is not at the passenger pickup location");
  }

  ride.status = "driver_arrived";
  ride.arrivedAt = new Date();
  await ride.save();

  return ride;
}

//-------------------- Start Ride --------------------

export async function startRideService({
  rideId,
  driverId,
  otpForStartRide,
  driverLocationCoordinates,
}) {
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

  if (
    !ride.pickup ||
    !ride.pickup.coordinates ||
    ride.pickup.coordinates.length !== 2
  ) {
    throw new Error("Ride pickup location is not available");
  }

  const driverLocation = normalizeLocationInput(driverLocationCoordinates, {
    referenceCoordinates: ride.pickup.coordinates,
  }).coordinates;

  if (!areCoordinatesClose(driverLocation, ride.pickup.coordinates)) {
    throw new Error("Driver is not at the passenger pickup location");
  }

  const incomingOtp = Number(otpForStartRide);
  if (ride.otpForStartRide !== incomingOtp) {
    throw new Error("Invalid OTP");
  }

  ride.status = "started";
  ride.startedAt = new Date();
  await ride.save();

  return ride;
}

//-------------------- Complete Ride --------------------

// Legacy "ongoing" accepted for in-flight rides created before the started refactor.
const COMPLETABLE_STATUSES = new Set(["started", "ongoing"]);

export async function completeRideService({
  rideId,
  driverId,
  driverLocationCoordinates,
}) {
  const ride = await Ride.findById(rideId);

  if (!ride) {
    throw new Error("Ride not found");
  }

  if (!ride.driver || ride.driver.toString() !== driverId.toString()) {
    throw new Error("You are not assigned to this ride");
  }

  if (!COMPLETABLE_STATUSES.has(ride.status)) {
    throw new Error(
      `Ride cannot be completed in current status: ${ride.status}`,
    );
  }

  if (
    !ride.drop ||
    !ride.drop.coordinates ||
    ride.drop.coordinates.length !== 2
  ) {
    throw new Error("Ride drop location is not available");
  }

  const driverLocation = normalizeLocationInput(driverLocationCoordinates, {
    referenceCoordinates: ride.drop.coordinates,
  }).coordinates;

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
      const { platformFee: pf, driverShare: ds } =
        calculateEarningsFromDistance(ride.distance, ride.vehicleType);

      driverShare = ds || 0;
      platformFee = pf || 0;
    }

    await Driver.findByIdAndUpdate(
      ride.driver,
      {
        $set: {
          driverStatus: DRIVER_AVAILABILITY_STATUS.AVAILABLE,
          currentRide: null,
          lastRideCompletedAt: new Date(),
        },

        $inc: {
          "earnings.totalEarnings": fare,
          "earnings.totalDriverPayout": driverShare,
          "earnings.totalPlatformFee": platformFee,
          "rideStats.completed": 1,
        },
      },
      { new: true },
    );
  }

  if (ride.passenger) {
    await incrementPassengerRideStat(ride.passenger, "completed");
  }

  return ride;
}

//------------------------ Update Driver Location with Throttling------------------------

export async function updateDriverLocationService(driver, lng, lat, rideId) {
  if (!driver?._id) {
    throw new Error("Driver not found or unauthorized");
  }

  const normalized = normalizeLocationInput(lng, lat);

  const ride = await Ride.findOne({
    _id: rideId,
    driver: driver._id,
    passenger: { $exists: true, $ne: null },
    // Include legacy "ongoing" for in-flight rides started before the status rename.
    status: { $in: ["accepted", "driver_arrived", "started", "ongoing"] },
  })
    .select("passenger status pickup drop")
    .lean();

  const currentTime = new Date();
  const lastUpdateTime = driver.lastLocationUpdateTime
    ? new Date(driver.lastLocationUpdateTime)
    : null;

  // Always persist during an active ride so passenger REST polls (~5s)
  // read fresh GPS. Otherwise throttle background presence writes.
  const shouldUpdateDB =
    Boolean(ride) ||
    !lastUpdateTime ||
    (currentTime - lastUpdateTime) / 1000 >= LOCATION_THROTTLE_SECONDS;

  applyLocationToDocument(driver, normalized.longitude, normalized.latitude, {
    updatedAt: currentTime,
    includeLastOnline: true,
    includeThrottleTimestamp: true,
  });

  if (shouldUpdateDB) {
    await driver.save();
  }

  return {
    id: driver._id,
    name: driver.name,
    vehicleType: driver.vehicleType,
    vehicleNumber: driver.vehicleNumber,
    coordinates: normalized.coordinates,
    longitude: normalized.longitude,
    latitude: normalized.latitude,
    location: normalized.location,
    updatedAt: currentTime,
    dbSaved: shouldUpdateDB,
    status: driver.driverStatus,
    lastOnlineTime: driver.lastOnline,
    ride,
  };
}
