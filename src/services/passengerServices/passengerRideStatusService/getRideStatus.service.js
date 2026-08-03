
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

const LIVE_TRACKING_STATUSES = new Set([
  "accepted",
  "driver_arrived",
  "started",
  "ongoing",
]);

function buildDriverLiveCoords(driver) {
  if (!driver) return null;

  let longitude;
  let latitude;

  const coordinates = driver.location?.coordinates;
  if (Array.isArray(coordinates) && coordinates.length === 2) {
    longitude = coordinates[0];
    latitude = coordinates[1];
  } else if (
    typeof driver.longitude === "number" &&
    typeof driver.latitude === "number"
  ) {
    longitude = driver.longitude;
    latitude = driver.latitude;
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
    locationUpdatedAt: driver.locationUpdatedAt || null,
  };
}

async function buildLiveTracking({ ride, driverCoords }) {
  const toPickup =
    ride.status === "accepted" || ride.status === "driver_arrived";
  const destination = toPickup ? ride.pickup : ride.drop;
  const phase = toPickup ? "to_pickup" : "to_drop";

  // Driver has not pushed GPS yet (update-location not called / no stored location).
  if (!driverCoords) {
    return {
      phase,
      status: ride.status,
      coordinates: null,
      latitude: null,
      longitude: null,
      lat: null,
      lng: null,
      locationUpdatedAt: null,
      destination: destination || null,
      etaMinutes: null,
      distance: null,
      polyline: ride.routeDetails?.polyline || null,
      available: false,
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
    phase,
    status: ride.status,
    coordinates: driverCoords.coordinates,
    latitude: driverCoords.latitude,
    longitude: driverCoords.longitude,
    lat: driverCoords.lat,
    lng: driverCoords.lng,
    locationUpdatedAt: driverCoords.locationUpdatedAt,
    destination: destination || null,
    etaMinutes,
    distance,
    polyline: ride.routeDetails?.polyline || null,
    available: true,
    message: null,
    timestamp: Date.now(),
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

  const driverCoords = buildDriverLiveCoords(ride.driver);
  const liveTracking = await buildLiveTracking({ ride, driverCoords });

  return {
    ...ride,
    driver: {
      id: ride.driver._id,
      name: ride.driver.name,
      contactNumber: ride.driver.contactNumber,
      vehicleNumber: ride.driver.vehicleNumber,
      vehicleType: ride.driver.vehicleType,
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
            locationUpdatedAt: driverCoords.locationUpdatedAt,
          }
        : {}),
    },
    liveTracking,
  };
}
 