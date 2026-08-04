import { Driver } from "../models/driver/driver.model.js";
import { DRIVER_AVAILABILITY_STATUS } from "../constants/userStatus.constants.js";
import { driverRideReceiveEligibilityQuery } from "./driverStatus.helper.js";
import { LOCATION_MAX_DISTANCE_METERS } from "../utils/location.js";

/**
 * Shared nearby-driver geospatial query used by ride creation and auto-assign.
 * Includes online AVAILABLE and ON_TRIP drivers (both may receive ride offers).
 * Results prefer AVAILABLE drivers first, then ON_TRIP, preserving $near distance
 * order within each group.
 */
export async function findNearbyDrivers(
  pickupCoordinates,
  {
    maxDistance = LOCATION_MAX_DISTANCE_METERS,
    vehicleType,
    select = "_id location driverStatus currentRide",
    extraQuery = {},
  } = {},
) {
  if (
    !Array.isArray(pickupCoordinates) ||
    pickupCoordinates.length !== 2 ||
    !pickupCoordinates.every((value) => typeof value === "number")
  ) {
    return [];
  }

  try {
    const query = driverRideReceiveEligibilityQuery({
      ...extraQuery,
      ...(vehicleType ? { vehicleType } : {}),
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: pickupCoordinates,
          },
          $maxDistance: maxDistance,
        },
      },
    });

    const drivers = await Driver.find(query).select(select);
    if (!drivers?.length) return [];

    // $near returns distance-sorted docs; bucket so free drivers are offered first.
    const available = [];
    const onTrip = [];
    const other = [];

    for (const driver of drivers) {
      if (driver.driverStatus === DRIVER_AVAILABILITY_STATUS.AVAILABLE) {
        available.push(driver);
      } else if (driver.driverStatus === DRIVER_AVAILABILITY_STATUS.ON_TRIP) {
        onTrip.push(driver);
      } else {
        other.push(driver);
      }
    }

    return [...available, ...onTrip, ...other];
  } catch (error) {
    console.error("Error finding nearby drivers:", error.message);
    return [];
  }
}
