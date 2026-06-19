import { getDistance } from "geolib";
import { getPricingConfig } from "../helpers/pricing.helper.js";

//--------------------------- Ride Distance Calculations ---------------------------
export function calculateDistance(pickup, drop) {
  // getDistance returns meters
  const distanceInMeters = getDistance(
    { latitude: pickup.lat, longitude: pickup.lng },
    { latitude: drop.lat, longitude: drop.lng },
  );
  return parseFloat((distanceInMeters / 1000).toFixed(2)); // km rounded to 2 decimals
}

//-------------------------------- Fare Calculations --------------------------------
export async function calculateFare(pickup, drop, vehicleType) {
  const distance = calculateDistance(pickup, drop);
  return await calculateFareFromDistance(distance, vehicleType);
}

//-------------------------------- Fare Calculations From Distance --------------------------------
export async function calculateFareFromDistance(distance, vehicleType) {
  if (!Number.isFinite(Number(distance)) || Number(distance) < 0) {
    throw new Error("Distance must be a valid positive number");
  }

  const pricingConfig = await getPricingConfig();
  const type = vehicleType.toLowerCase();

  const config = pricingConfig[type];
  if (!config) {
    throw new Error(`Unsupported vehicle type: ${vehicleType}`);
  }

  const baseFare = distance * config.baseFarePerKm;
  const platformFee = distance * config.platformFeePerKm;
  const driverShare = distance * config.driverSharePerKm;

  const round2 = (v) => Number(v.toFixed(2));

  return {
    distanceInKm: distance,
    vehicleType: type,
    baseFare: round2(baseFare),
    platformFee: round2(platformFee),
    driverShare: round2(driverShare),
    totalFare: Math.round(baseFare),
  };
}

//------------------------------ Calculate Earning from Distance ------------------------------
export async function calculateEarningsFromDistance(distance, vehicleType) {
  const pricingConfig = await getPricingConfig();

  const config = pricingConfig[vehicleType.toLowerCase()];

  if (!config) {
    throw new Error(`Unsupported vehicle type: ${vehicleType}`);
  }
  const round2 = (value) => parseFloat(value.toFixed(2));

  return {
    baseFare: round2(distance * config.baseFarePerKm),
    platformFee: round2(distance * config.platformFeePerKm),
    driverShare: round2(distance * config.driverSharePerKm),
  };
}
