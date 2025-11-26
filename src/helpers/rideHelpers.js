import { getDistance } from "geolib";

// Helper functions for ride calculations
export function calculateDistance(pickup, drop) {
  // getDistance returns meters
  const distanceInMeters = getDistance(
    { latitude: pickup.lat, longitude: pickup.lng },
    { latitude: drop.lat, longitude: drop.lng }
  );
  return parseFloat((distanceInMeters / 1000).toFixed(2)); // km rounded to 2 decimals
}

const pricingConfig = {
  bike: {
    baseFarePerKm: 8,
    platformFeePerKm: 1.89,
    driverSharePerKm: 6.4,
  },
  auto: {
    baseFarePerKm: 11,
    platformFeePerKm: 2.6,
    driverSharePerKm: 8.8,
  },
  cab: {
    baseFarePerKm: 15,
    platformFeePerKm: 3.54,
    driverSharePerKm: 12,
  },
};

// Calculate fare based on distance and vehicle type
export function calculateFare(pickup, drop, vehicleType) {
  const distance = calculateDistance(pickup, drop);

  const type = (vehicleType || "").toString().toLowerCase();

  const config = pricingConfig[type];
  if (!config) {
    throw new Error(`Unsupported vehicle type: ${vehicleType}`);
  }

  const baseFare = distance * config.baseFarePerKm;
  const platformFee = distance * config.platformFeePerKm;
  const driverShare = distance * config.driverSharePerKm;

  const round2 = (value) => parseFloat(value.toFixed(2));

  const roundedBaseFare = round2(baseFare);
  const roundedPlatformFee = round2(platformFee);
  const roundedDriverShare = round2(driverShare);
  const totalFare = Math.round(roundedBaseFare + roundedPlatformFee);

  return {
    distanceInKm: distance,
    vehicleType: type,
    baseFare: roundedBaseFare,
    platformFee: roundedPlatformFee,
    driverShare: roundedDriverShare,
    totalFare,
  };
}

export function calculateEarningsFromDistance(distance, vehicleType) {
  const type = (vehicleType || "").toString().toLowerCase();

  const config = pricingConfig[type];
  if (!config) {
    throw new Error(`Unsupported vehicle type: ${vehicleType}`);
  }

  const baseFare = distance * config.baseFarePerKm;
  const platformFee = distance * config.platformFeePerKm;
  const driverShare = distance * config.driverSharePerKm;

  const round2 = (value) => parseFloat(value.toFixed(2));

  return {
    baseFare: round2(baseFare),
    platformFee: round2(platformFee),
    driverShare: round2(driverShare),
  };
}
