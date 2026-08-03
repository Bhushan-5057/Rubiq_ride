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
  isValidCoordinatePair,
  LOCATION_THROTTLE_SECONDS,
  normalizeLocationInput,
} from "../../../utils/location.js";
import { incrementPassengerRideStat } from "../../../helpers/rideStatsCounters.helper.js";

const ACTIVE_TRACKING_STATUSES = [
  "accepted",
  "driver_arrived",
  "started",
  "ongoing",
];

const LOCATION_HISTORY_MAX = 50;

function buildRideLiveLocationPayload({
  driverId,
  longitude,
  latitude,
  updatedAt,
}) {
  return {
    type: "Point",
    coordinates: [longitude, latitude],
    longitude,
    latitude,
    updatedAt,
    driverId,
  };
}

async function persistRideLiveLocation({
  rideId,
  driverId,
  longitude,
  latitude,
  updatedAt,
}) {
  const liveLocation = buildRideLiveLocationPayload({
    driverId,
    longitude,
    latitude,
    updatedAt,
  });

  return Ride.findOneAndUpdate(
    {
      _id: rideId,
      driver: driverId,
      status: { $in: ACTIVE_TRACKING_STATUSES },
    },
    {
      $set: { liveLocation },
      $push: {
        locationHistory: {
          $each: [
            {
              coordinates: [longitude, latitude],
              longitude,
              latitude,
              updatedAt,
            },
          ],
          $slice: -LOCATION_HISTORY_MAX,
        },
      },
    },
    {
      new: true,
      select: "passenger status pickup drop liveLocation routeDetails",
    },
  ).lean();
}

//-------------------- Accept Ride --------------------

export async function acceptRideService({ rideId, driverId }) {
  const eligibleDriver = await Driver.findOne(
    driverRideEligibilityQuery({ _id: driverId }),
  );

  if (!eligibleDriver || !canDriverAcceptRide(eligibleDriver)) {
    throw new Error("Driver is not eligible to accept rides");
  }

  const seedCoords = eligibleDriver.location?.coordinates;
  const hasSeed =
    Array.isArray(seedCoords) &&
    seedCoords.length === 2 &&
    isValidCoordinatePair(seedCoords[0], seedCoords[1]) &&
    !(seedCoords[0] === 0 && seedCoords[1] === 0);

  const acceptedAt = new Date();
  const update = {
    driver: driverId,
    status: "accepted",
    acceptedAt,
    currentOfferedDriver: null,
    skippedDrivers: [],
  };

  if (hasSeed) {
    update.liveLocation = buildRideLiveLocationPayload({
      driverId,
      longitude: seedCoords[0],
      latitude: seedCoords[1],
      updatedAt: eligibleDriver.locationUpdatedAt || acceptedAt,
    });
    update.locationHistory = [
      {
        coordinates: [seedCoords[0], seedCoords[1]],
        longitude: seedCoords[0],
        latitude: seedCoords[1],
        updatedAt: eligibleDriver.locationUpdatedAt || acceptedAt,
      },
    ];
  }

  // Only the driver currently holding the sequential offer may accept.
  const ride = await Ride.findOneAndUpdate(
    {
      _id: rideId,
      status: "pending",
      currentOfferedDriver: driverId,
    },
    update,
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

  const arrivedAt = new Date();
  ride.status = "driver_arrived";
  ride.arrivedAt = arrivedAt;
  ride.liveLocation = buildRideLiveLocationPayload({
    driverId,
    longitude: driverLocation[0],
    latitude: driverLocation[1],
    updatedAt: arrivedAt,
  });
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

  const startedAt = new Date();
  ride.status = "started";
  ride.startedAt = startedAt;
  ride.liveLocation = buildRideLiveLocationPayload({
    driverId,
    longitude: driverLocation[0],
    latitude: driverLocation[1],
    updatedAt: startedAt,
  });
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

  const currentTime = new Date();
  const lastUpdateTime = driver.lastLocationUpdateTime
    ? new Date(driver.lastLocationUpdateTime)
    : null;

  // Always persist during an active assigned ride so passenger REST polls (~5s)
  // read fresh GPS. Otherwise throttle background presence writes.
  let ride = null;
  if (rideId) {
    ride = await persistRideLiveLocation({
      rideId,
      driverId: driver._id,
      longitude: normalized.longitude,
      latitude: normalized.latitude,
      updatedAt: currentTime,
    });
  }

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

  // If rideId was sent but ride was not assigned/active, still load for socket gating.
  if (!ride && rideId) {
    ride = await Ride.findOne({
      _id: rideId,
      driver: driver._id,
      passenger: { $exists: true, $ne: null },
      status: { $in: ACTIVE_TRACKING_STATUSES },
    })
      .select("passenger status pickup drop liveLocation routeDetails")
      .lean();
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
