import { Ride } from "../../../models/ride/ride.model.js";
import {
  buildRideHistoryDateFilter,
  summarizeRideStatuses,
} from "../../../helpers/rideHistoryFilter.helper.js";
import { readDriverRideStats } from "../../../helpers/rideStatsCounters.helper.js";
import { Driver } from "../../../models/driver/driver.model.js";

//------------------------ Get Ride By ID ------------------------
export async function getRideByIdService(rideId, driverId) {
  const ride = await Ride.findById(rideId);

  if (!ride) {
    throw new Error("Ride not found");
  }
  if (!ride.driver || ride.driver.toString() !== driverId.toString()) {
    throw new Error("You are not assigned to this ride");
  }
  return ride;
}

//------------------------ Get All Rides ------------------------
export async function getAllRidesForDriverService(driverId, filters = {}) {
  const dateFilter = buildRideHistoryDateFilter(filters);
  const query = { driver: driverId, ...dateFilter };

  const rides = await Ride.find(query).sort({ createdAt: -1 });
  const driver = await Driver.findById(driverId).select("rideStats");
  const lifetimeStats = readDriverRideStats(driver);
  const filteredStats = summarizeRideStatuses(rides);

  return {
    rides,
    stats: {
      lifetime: lifetimeStats,
      filtered: {
        completed: filteredStats.completed,
        cancelled: filteredStats.cancelled,
        missed: filteredStats.missed,
      },
    },
  };
}
