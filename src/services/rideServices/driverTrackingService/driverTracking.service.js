import { Ride } from "../../../models/ride/ride.model.js";
import { Driver } from "../../../models/driver/driver.model.js";
import { areCoordinatesClose } from "../../../common/utils.js";
import { calculateEarningsFromDistance } from "../../../helpers/rideHelpers.js";
import { removeRideTimeoutJob } from "../../../queues/rideTimeout.queue.js";
import { DRIVER_AVAILABILITY_STATUS } from "../../../constants/userStatus.constants.js";
import {
  canDriverAcceptRide,
  getDriverAcceptBlockedMessage,
} from "../../../helpers/driverStatus.helper.js";
import {
  applyLocationToDocument,
  buildLiveLocationPoint,
  buildLocationSetPayload,
  extractNormalizedCoords,
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

function buildRideLiveLocationPayload({
  driverId,
  longitude,
  latitude,
  updatedAt,
}) {
  return buildLiveLocationPoint({
    driverId,
    longitude,
    latitude,
    updatedAt,
  });
}

/** Single latest GPS snapshot — never append (avoids ride doc bloat). */
function buildLocationHistoryEntry({ longitude, latitude, updatedAt }) {
  return {
    coordinates: [longitude, latitude],
    longitude,
    latitude,
    updatedAt,
  };
}

function resolveDriverSeedCoords(driver) {
  return extractNormalizedCoords(driver);
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

  // Always $set liveLocation + overwrite locationHistory with one entry.
  // Do not $push — long trails bloated rides and risked stuck live updates.
  return Ride.findOneAndUpdate(
    {
      _id: rideId,
      driver: driverId,
      status: { $in: ACTIVE_TRACKING_STATUSES },
    },
    {
      $set: {
        liveLocation,
        locationHistory: [
          buildLocationHistoryEntry({ longitude, latitude, updatedAt }),
        ],
      },
    },
    {
      new: true,
      select: "passenger status pickup drop liveLocation routeDetails acceptedAt",
    },
  ).lean();
}

async function persistDriverPresenceLocation({
  driverId,
  longitude,
  latitude,
  updatedAt,
  setOnline = false,
}) {
  const payload = buildLocationSetPayload(longitude, latitude, {
    updatedAt,
    includeThrottleTimestamp: true,
    includeLastOnline: true,
  });

  const $set = {
    location: payload.location,
    longitude: payload.longitude,
    latitude: payload.latitude,
    locationUpdatedAt: payload.locationUpdatedAt,
    lastLocationUpdateTime: payload.lastLocationUpdateTime,
    lastOnline: payload.lastOnline,
  };

  if (setOnline) {
    $set.isOnline = true;
  }

  return Driver.findByIdAndUpdate(
    driverId,
    { $set },
    {
      new: true,
      select:
        "name vehicleType vehicleNumber contactNumber location latitude longitude locationUpdatedAt lastLocationUpdateTime lastOnline driverStatus isOnline currentRide",
    },
  ).lean();
}

//-------------------- Accept Ride --------------------

export async function acceptRideService({ rideId, driverId }) {
  const eligibleDriver = await Driver.findById(driverId);

  if (!eligibleDriver || !canDriverAcceptRide(eligibleDriver)) {
    throw new Error(getDriverAcceptBlockedMessage(eligibleDriver));
  }

  const seed = resolveDriverSeedCoords(eligibleDriver);
  const acceptedAt = new Date();
  const update = {
    driver: driverId,
    status: "accepted",
    acceptedAt,
    currentOfferedDriver: null,
    skippedDrivers: [],
  };

  if (seed) {

    update.liveLocation = buildRideLiveLocationPayload({
      driverId,
      longitude: seed.longitude,
      latitude: seed.latitude,
      updatedAt: acceptedAt,
    });
    update.locationHistory = [
      buildLocationHistoryEntry({
        longitude: seed.longitude,
        latitude: seed.latitude,
        updatedAt: acceptedAt,
      }),
    ];
  }

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

  const normalized = normalizeLocationInput(driverLocationCoordinates, {
    referenceCoordinates: ride.pickup.coordinates,
  });
  const driverLocation = normalized.coordinates;

  if (!areCoordinatesClose(driverLocation, ride.pickup.coordinates)) {
    throw new Error("Driver is not at the passenger pickup location");
  }

  const arrivedAt = new Date();
  ride.status = "driver_arrived";
  ride.arrivedAt = arrivedAt;
  ride.liveLocation = buildRideLiveLocationPayload({
    driverId,
    longitude: normalized.longitude,
    latitude: normalized.latitude,
    updatedAt: arrivedAt,
  });
  await ride.save();

  await persistDriverPresenceLocation({
    driverId,
    longitude: normalized.longitude,
    latitude: normalized.latitude,
    updatedAt: arrivedAt,
  });

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

  const normalized = normalizeLocationInput(driverLocationCoordinates, {
    referenceCoordinates: ride.pickup.coordinates,
  });
  const driverLocation = normalized.coordinates;

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
    longitude: normalized.longitude,
    latitude: normalized.latitude,
    updatedAt: startedAt,
  });
  await ride.save();

  await persistDriverPresenceLocation({
    driverId,
    longitude: normalized.longitude,
    latitude: normalized.latitude,
    updatedAt: startedAt,
  });

  return ride;
}

//-------------------- Complete Ride --------------------

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

  const normalized = normalizeLocationInput(driverLocationCoordinates, {
    referenceCoordinates: ride.drop.coordinates,
  });
  const driverLocation = normalized.coordinates;

  if (!areCoordinatesClose(driverLocation, ride.drop.coordinates)) {
    throw new Error("Driver is not at the passenger drop location");
  }

  const completedAt = new Date();
  ride.status = "completed";
  ride.completedAt = completedAt;
  ride.liveLocation = buildRideLiveLocationPayload({
    driverId,
    longitude: normalized.longitude,
    latitude: normalized.latitude,
    updatedAt: completedAt,
  });
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

    const presence = buildLocationSetPayload(
      normalized.longitude,
      normalized.latitude,
      {
        updatedAt: completedAt,
        includeThrottleTimestamp: true,
        includeLastOnline: true,
      },
    );

    await Driver.findByIdAndUpdate(
      ride.driver,
      {
        $set: {
          driverStatus: DRIVER_AVAILABILITY_STATUS.AVAILABLE,
          currentRide: null,
          lastRideCompletedAt: completedAt,
          location: presence.location,
          longitude: presence.longitude,
          latitude: presence.latitude,
          locationUpdatedAt: presence.locationUpdatedAt,
          lastLocationUpdateTime: presence.lastLocationUpdateTime,
          lastOnline: presence.lastOnline,
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

async function resolveTrackingRideId(driver, rideId) {
  if (rideId) return rideId;
  if (driver?.currentRide) return driver.currentRide;

  const activeRide = await Ride.findOne({
    driver: driver._id,
    status: { $in: ACTIVE_TRACKING_STATUSES },
  })
    .select("_id")
    .sort({ acceptedAt: -1 })
    .lean();

  return activeRide?._id || null;
}

export async function updateDriverLocationService(driver, lng, lat, rideId) {
  if (!driver?._id) {
    throw new Error("Driver not found or unauthorized");
  }

  const normalized = normalizeLocationInput(lng, lat);

  const currentTime = new Date();
  const lastUpdateTime = driver.lastLocationUpdateTime
    ? new Date(driver.lastLocationUpdateTime)
    : null;

  const trackingRideId = await resolveTrackingRideId(driver, rideId);
  const isTracking = Boolean(trackingRideId);

  const shouldWritePresence =
    isTracking ||
    !lastUpdateTime ||
    (currentTime - lastUpdateTime) / 1000 >= LOCATION_THROTTLE_SECONDS;

  let ride = null;
  let savedDriver = null;

  if (isTracking) {
    const [persistedRide, persistedDriver] = await Promise.all([
      persistRideLiveLocation({
        rideId: trackingRideId,
        driverId: driver._id,
        longitude: normalized.longitude,
        latitude: normalized.latitude,
        updatedAt: currentTime,
      }),
      persistDriverPresenceLocation({
        driverId: driver._id,
        longitude: normalized.longitude,
        latitude: normalized.latitude,
        updatedAt: currentTime,
        setOnline: true,
      }),
    ]);

    ride = persistedRide;
    savedDriver = persistedDriver;

    if (driver) {
      applyLocationToDocument(
        driver,
        normalized.longitude,
        normalized.latitude,
        {
          updatedAt: currentTime,
          includeLastOnline: true,
          includeThrottleTimestamp: true,
        },
      );
      driver.isOnline = true;
    }
  } else if (shouldWritePresence) {
    applyLocationToDocument(driver, normalized.longitude, normalized.latitude, {
      updatedAt: currentTime,
      includeLastOnline: true,
      includeThrottleTimestamp: true,
    });
    await driver.save();
    savedDriver = {
      location: driver.location,
      latitude: driver.latitude,
      longitude: driver.longitude,
      locationUpdatedAt: driver.locationUpdatedAt,
    };
  } else {
    applyLocationToDocument(driver, normalized.longitude, normalized.latitude, {
      updatedAt: currentTime,
      includeLastOnline: true,
      includeThrottleTimestamp: false,
    });
  }

  if (!ride && trackingRideId) {
    ride = await Ride.findOne({
      _id: trackingRideId,
      driver: driver._id,
      passenger: { $exists: true, $ne: null },
      status: { $in: ACTIVE_TRACKING_STATUSES },
    })
      .select("passenger status pickup drop liveLocation routeDetails acceptedAt")
      .lean();
  }

  const liveLocation = ride?.liveLocation
    ? buildRideLiveLocationPayload({
        driverId: driver._id,
        longitude: normalized.longitude,
        latitude: normalized.latitude,
        updatedAt: currentTime,
      })
    : null;

  if (ride && liveLocation) {
    ride = { ...ride, liveLocation };
  }

  return {
    id: driver._id,
    name: driver.name,
    vehicleType: driver.vehicleType,
    vehicleNumber: driver.vehicleNumber,
    contactNumber: driver.contactNumber,
    coordinates: normalized.coordinates,
    longitude: normalized.longitude,
    latitude: normalized.latitude,
    lat: normalized.latitude,
    lng: normalized.longitude,
    location: {
      type: "Point",
      coordinates: normalized.coordinates,
      longitude: normalized.longitude,
      latitude: normalized.latitude,
      lat: normalized.latitude,
      lng: normalized.longitude,
    },
    updatedAt: currentTime,
    locationUpdatedAt: currentTime,
    dbSaved: isTracking || shouldWritePresence,
    tracking: isTracking,
    status: savedDriver?.driverStatus ?? driver.driverStatus,
    lastOnlineTime: currentTime,
    ride,
    trackingRideId: trackingRideId || null,
    liveLocation,
  };
}

export { ACTIVE_TRACKING_STATUSES, resolveDriverSeedCoords };
