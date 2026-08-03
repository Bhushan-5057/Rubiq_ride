
import { Ride } from "../../../models/ride/ride.model.js";
import { Driver } from "../../../models/driver/driver.model.js";
import { Passenger } from "../../../models/passenger/passenger.model.js";
import { getDistanceMatrix } from "../../googleMaps/googleMaps.service.js";
import {
  buildRideHistoryDateFilter,
  summarizeRideStatuses,
} from "../../../helpers/rideHistoryFilter.helper.js";
import { readPassengerRideStats } from "../../../helpers/rideStatsCounters.helper.js";

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

  // Driver details are relevant from accept through in-progress (legacy "ongoing" included).
  const statusesWithDriverTracking = new Set([
    "accepted",
    "driver_arrived",
    "started",
    "ongoing",
  ]);

  if (!statusesWithDriverTracking.has(ride.status)) {
    return {
      rideId: ride._id,
      status: ride.status,
      driver: null,
      distanceFromPickup: "N/A",
    };
  }

  const driver = await Driver.findById(ride.driver).lean();
  if (!driver) {
    return {
      rideId: ride._id,
      status: ride.status,
      driver: null,
      distanceFromPickup: "N/A",
    };
  }

  const rideWithDriver = { ...ride, driver };
  const driverCoords = resolveLiveDriverCoords(rideWithDriver);
  if (!driverCoords) {
    return {
      rideId: ride._id,
      status: ride.status,
      driver: {
        id: driver._id,
        name: driver.name,
        vehicleNumber: driver.vehicleNumber,
        vehicleType: driver.vehicleType,
      },
      distanceFromPickup: "N/A",
      liveTracking: await buildLiveTracking({ ride, driverCoords: null }),
    };
  }

  const toPickup =
    ride.status === "accepted" || ride.status === "driver_arrived";
  const destination = toPickup ? ride.pickup : ride.drop;

  let distanceText = "N/A";
  let etaMinutes = null;
  if (destination?.coordinates?.length === 2) {
    try {
      const matrix = await getDistanceMatrix({
        origins: [driverCoords.coordinates],
        destinations: [destination.coordinates],
      });
      const element = matrix.rows[0]?.elements[0];
      distanceText = element?.distance?.text || "N/A";
      etaMinutes =
        element?.durationInTraffic?.minutes ||
        element?.duration?.minutes ||
        null;
    } catch {
      distanceText = "N/A";
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
      coordinates: driverCoords.coordinates,
      latitude: driverCoords.latitude,
      longitude: driverCoords.longitude,
      lat: driverCoords.lat,
      lng: driverCoords.lng,
    },
    distanceFromPickup: toPickup ? distanceText : "N/A",
    etaToPickupMinutes: toPickup ? etaMinutes : null,
    distanceToDrop: toPickup ? null : distanceText,
    etaToDropMinutes: toPickup ? null : etaMinutes,
    liveTracking: {
      available: true,
      phase: toPickup ? "to_pickup" : "to_drop",
      coordinates: driverCoords.coordinates,
      latitude: driverCoords.latitude,
      longitude: driverCoords.longitude,
      lat: driverCoords.lat,
      lng: driverCoords.lng,
      etaMinutes,
      tripPolyline: ride.routeDetails?.polyline || null,
      polyline: ride.routeDetails?.polyline || null,
    },
  };
}

//------------------------ Get All Rides ------------------------
export async function getPassengerAllRideService(passengerId, filters = {}) {
  if (!passengerId) throw new Error("Passenger ID is required");

  const dateFilter = buildRideHistoryDateFilter(filters);
  const rides = await Ride.find({ passenger: passengerId, ...dateFilter })
    .populate("driver", "name vehicleNumber vehicleType contactNumber")
    .sort({ createdAt: -1 });

  const mapped = rides.map((ride) => ({
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

  const passenger = await Passenger.findById(passengerId).select("rideStats");
  const filteredStats = summarizeRideStatuses(rides);

  return {
    rides: mapped,
    stats: {
      lifetime: readPassengerRideStats(passenger),
      filtered: {
        completed: filteredStats.completed,
        cancelled: filteredStats.cancelled,
      },
    },
  };
}

//--------------------- Get Passenger Ride By Id ---------------------
// Polled ~every 5s during live tracking. Prefers ride.liveLocation
// (written by assigned driver update-location); falls back to Driver GPS.

const LIVE_TRACKING_STATUSES = new Set([
  "accepted",
  "driver_arrived",
  "started",
  "ongoing",
]);

function coordsFromPoint(source) {
  if (!source) return null;

  let longitude;
  let latitude;

  if (Array.isArray(source.coordinates) && source.coordinates.length === 2) {
    longitude = source.coordinates[0];
    latitude = source.coordinates[1];
  } else if (
    typeof source.longitude === "number" &&
    typeof source.latitude === "number"
  ) {
    longitude = source.longitude;
    latitude = source.latitude;
  }

  if (
    typeof longitude !== "number" ||
    typeof latitude !== "number" ||
    (longitude === 0 && latitude === 0)
  ) {
    return null;
  }

  return {
    coordinates: [longitude, latitude],
    longitude,
    latitude,
    lng: longitude,
    lat: latitude,
    updatedAt: source.updatedAt || source.locationUpdatedAt || null,
  };
}

function resolveLiveDriverCoords(ride) {
  const fromRide = coordsFromPoint(ride.liveLocation);
  if (fromRide) {
    return { ...fromRide, source: "ride" };
  }

  const fromDriver = coordsFromPoint(ride.driver);
  if (fromDriver) {
    return {
      ...fromDriver,
      updatedAt: ride.driver?.locationUpdatedAt || fromDriver.updatedAt,
      source: "driver",
    };
  }

  // Driver doc may nest GeoJSON under `.location`
  const fromDriverLocation = coordsFromPoint(ride.driver?.location);
  if (fromDriverLocation) {
    return {
      ...fromDriverLocation,
      updatedAt: ride.driver?.locationUpdatedAt || null,
      source: "driver",
    };
  }

  return null;
}

function mapPhase(status) {
  if (status === "accepted" || status === "driver_arrived") {
    return {
      phase: "to_pickup",
      destination: null, // filled by caller with ride.pickup
      message: "Your driver is on the way to pickup",
    };
  }
  return {
    phase: "to_drop",
    destination: null, // filled by caller with ride.drop
    message: "Your ride is in progress",
  };
}

async function buildLiveTracking({ ride, driverCoords }) {
  const phaseInfo = mapPhase(ride.status);
  const destination =
    phaseInfo.phase === "to_pickup" ? ride.pickup : ride.drop;

  const tripPolyline = ride.routeDetails?.polyline || null;

  if (!driverCoords) {
    return {
      available: false,
      phase: phaseInfo.phase,
      status: ride.status,
      coordinates: null,
      latitude: null,
      longitude: null,
      lat: null,
      lng: null,
      locationUpdatedAt: null,
      destination: destination || null,
      pickup: ride.pickup || null,
      drop: ride.drop || null,
      etaMinutes: null,
      distance: null,
      // Full trip route (pickup → drop) for Google Maps polyline decode.
      tripPolyline,
      polyline: tripPolyline,
      // Remaining route origin for client Directions: driver → destination.
      remainingRouteOrigin: null,
      remainingRouteDestination: destination?.coordinates
        ? {
            lat: destination.coordinates[1],
            lng: destination.coordinates[0],
          }
        : null,
      message:
        "Driver live location not available yet. Waiting for driver update-location.",
      timestamp: Date.now(),
    };
  }

  let etaMinutes = null;
  let distance = null;

  if (destination?.coordinates?.length === 2) {
    try {
      const matrix = await getDistanceMatrix({
        origins: [driverCoords.coordinates],
        destinations: [destination.coordinates],
      });
      const element = matrix.rows[0]?.elements[0];
      etaMinutes =
        element?.durationInTraffic?.minutes ||
        element?.duration?.minutes ||
        null;
      distance = element?.distance || null;
    } catch {
      // Keep coords even if ETA lookup fails.
    }
  }

  return {
    available: true,
    phase: phaseInfo.phase,
    status: ride.status,
    coordinates: driverCoords.coordinates,
    latitude: driverCoords.latitude,
    longitude: driverCoords.longitude,
    lat: driverCoords.lat,
    lng: driverCoords.lng,
    locationUpdatedAt: driverCoords.updatedAt,
    source: driverCoords.source,
    destination: destination || null,
    pickup: ride.pickup || null,
    drop: ride.drop || null,
    etaMinutes,
    distance,
    tripPolyline,
    polyline: tripPolyline,
    // Passenger Google Maps SDK: animate marker to these coords;
    // optionally request Directions from remainingRouteOrigin → remainingRouteDestination.
    remainingRouteOrigin: {
      lat: driverCoords.latitude,
      lng: driverCoords.longitude,
    },
    remainingRouteDestination: destination?.coordinates
      ? {
          lat: destination.coordinates[1],
          lng: destination.coordinates[0],
        }
      : null,
    message: phaseInfo.message,
    timestamp: Date.now(),
  };
}

function formatDriverForPassenger(driver, driverCoords) {
  if (!driver) return null;

  return {
    id: driver._id,
    name: driver.name,
    contactNumber: driver.contactNumber,
    vehicleNumber: driver.vehicleNumber,
    vehicleType: driver.vehicleType,
    ...(driverCoords
      ? {
          coordinates: driverCoords.coordinates,
          latitude: driverCoords.latitude,
          longitude: driverCoords.longitude,
          lat: driverCoords.lat,
          lng: driverCoords.lng,
          location: {
            type: "Point",
            coordinates: driverCoords.coordinates,
            latitude: driverCoords.latitude,
            longitude: driverCoords.longitude,
            lat: driverCoords.lat,
            lng: driverCoords.lng,
          },
          locationUpdatedAt: driverCoords.updatedAt,
        }
      : {}),
  };
}

export async function getPassengerRideByIdService(rideId, passengerId) {
  const ride = await Ride.findById(rideId)
    .populate({
      path: "driver",
      select:
        "name contactNumber vehicleNumber vehicleType location latitude longitude locationUpdatedAt",
    })
    .lean();

  if (!ride) {
    throw new Error("Ride not Found");
  }
  if (ride.passenger.toString() !== passengerId.toString()) {
    throw new Error("You Have Not Created This Ride");
  }

  if (!LIVE_TRACKING_STATUSES.has(ride.status) || !ride.driver) {
    return ride;
  }

  const driverCoords = resolveLiveDriverCoords(ride);
  const liveTracking = await buildLiveTracking({ ride, driverCoords });

  // Avoid leaking full locationHistory trail to passenger clients.
  const { locationHistory: _locationHistory, ...rideWithoutHistory } = ride;

  return {
    ...rideWithoutHistory,
    driver: formatDriverForPassenger(ride.driver, driverCoords),
    liveTracking,
    // Top-level aliases for map clients that expect flat lat/lng on the ride payload.
    ...(driverCoords
      ? {
          driverLatitude: driverCoords.latitude,
          driverLongitude: driverCoords.longitude,
          driverLat: driverCoords.lat,
          driverLng: driverCoords.lng,
        }
      : {
          driverLatitude: null,
          driverLongitude: null,
          driverLat: null,
          driverLng: null,
        }),
  };
}
 