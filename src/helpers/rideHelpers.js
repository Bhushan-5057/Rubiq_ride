import { getDistance } from "geolib";

export function calculateDistance(pickup, drop) {
  // getDistance returns meters
  const distanceInMeters = getDistance(
    { latitude: pickup.lat, longitude: pickup.lng },
    { latitude: drop.lat, longitude: drop.lng }
  );
  return parseFloat((distanceInMeters / 1000).toFixed(2)); // km rounded to 2 decimals
}

export function calculateFare(pickup, drop) {
  const distance = calculateDistance(pickup, drop);
  return Math.round(50 + distance * 10); 
}
