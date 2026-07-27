import { Driver } from "../../models/driver/driver.model.js";
import { Passenger } from "../../models/passenger/passenger.model.js";
import {
  readDriverRideStats,
  readPassengerRideStats,
} from "../../helpers/rideStatsCounters.helper.js";

// Driver Stats — prefer durable rideStats counters.
export async function getDriverStats(driverId) {
  const driver = await Driver.findById(driverId).select("rideStats");
  return readDriverRideStats(driver);
}

// Passenger Stats — prefer durable rideStats counters.
export async function getPassengerStats(passengerId) {
  const passenger = await Passenger.findById(passengerId).select("rideStats");
  return readPassengerRideStats(passenger);
}
