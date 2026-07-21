import { Driver } from "../models/driver/driver.model.js";
import { driverRideEligibilityQuery } from "./driverStatus.helper.js";
import { LOCATION_MAX_DISTANCE_METERS } from "../utils/location.js";

/**
 * Shared nearby-driver geospatial query used by ride creation and auto-assign.
 * Relies on Driver.location 2dsphere index.
 */
export async function findNearbyDrivers(
  pickupCoordinates,
  {
    maxDistance = LOCATION_MAX_DISTANCE_METERS,
    vehicleType,
    select = "_id location",
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
    const query = driverRideEligibilityQuery({
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

    return await Driver.find(query).select(select);
  } catch (error) {
    console.error("Error finding nearby drivers:", error.message);
    return [];
  }
}
