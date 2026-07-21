/**
 * Canonical location helpers for GeoJSON Point storage.
 * Coordinate order is always [longitude, latitude].
 */

export const LOCATION_MAX_DISTANCE_METERS = 5000;
export const LOCATION_THROTTLE_SECONDS = 5;

export const isFiniteNumber = (value) =>
  typeof value === "number" && Number.isFinite(value);

export const isValidLongitude = (lng) =>
  isFiniteNumber(lng) && lng >= -180 && lng <= 180;

export const isValidLatitude = (lat) =>
  isFiniteNumber(lat) && lat >= -90 && lat <= 90;

export const isValidCoordinatePair = (lng, lat) =>
  isValidLongitude(lng) && isValidLatitude(lat);

export const isValidCoordinatesArray = (coordinates) =>
  Array.isArray(coordinates) &&
  coordinates.length === 2 &&
  isValidCoordinatePair(coordinates[0], coordinates[1]);

export const isValidGeoPoint = (point) =>
  point &&
  point.type === "Point" &&
  isValidCoordinatesArray(point.coordinates);

export const buildGeoPoint = (longitude, latitude) => ({
  type: "Point",
  coordinates: [longitude, latitude],
});

const toRadians = (degrees) => (degrees * Math.PI) / 180;

const haversineMeters = (lngLatA, lngLatB) => {
  const [lng1, lat1] = lngLatA;
  const [lng2, lat2] = lngLatB;
  const R = 6371000;
  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const dPhi = toRadians(lat2 - lat1);
  const dLambda = toRadians(lng2 - lng1);
  const a =
    Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(dLambda / 2) *
      Math.sin(dLambda / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * Resolve an ambiguous 2-number array to GeoJSON [longitude, latitude].
 *
 * Mobile GPS / Google often send [latitude, longitude].
 * MongoDB GeoJSON and this backend always store [longitude, latitude].
 *
 * When both values are <= 90, order is ambiguous. Pass `referenceCoordinates`
 * (e.g. ride pickup/drop already stored as [lng, lat]) to pick the order that
 * is geographically closer to the reference.
 */
export function resolveLngLatPair(pair, referenceCoordinates = null) {
  if (!Array.isArray(pair) || pair.length !== 2) {
    throw new Error("Coordinates must be a [lng, lat] or [lat, lng] array");
  }

  const a = Number(pair[0]);
  const b = Number(pair[1]);

  const asLngLat = isValidCoordinatePair(a, b) ? [a, b] : null;
  const asLatLng = isValidCoordinatePair(b, a) ? [b, a] : null;

  if (!asLngLat && !asLatLng) {
    throw new Error(
      "Invalid coordinates. Expected longitude [-180,180] and latitude [-90,90]",
    );
  }

  // Unambiguous: one value cannot be a latitude.
  if (Math.abs(a) > 90 && asLngLat) return asLngLat;
  if (Math.abs(b) > 90 && asLatLng) return asLatLng;

  if (
    referenceCoordinates &&
    isValidCoordinatesArray(referenceCoordinates) &&
    asLngLat &&
    asLatLng
  ) {
    const distLngLat = haversineMeters(asLngLat, referenceCoordinates);
    const distLatLng = haversineMeters(asLatLng, referenceCoordinates);
    return distLatLng < distLngLat ? asLatLng : asLngLat;
  }

  // Default GeoJSON / MongoDB convention: [longitude, latitude]
  if (asLngLat) return asLngLat;
  return asLatLng;
}

/**
 * Accepts common client shapes and returns normalized { longitude, latitude, location }.
 * Supported:
 * - (lng, lat) numbers
 * - { lng, lat } / { longitude, latitude }
 * - { coordinates: [lng, lat] } or ambiguous [lat, lng] with referenceCoordinates
 * - GeoJSON { type: "Point", coordinates: [lng, lat] }
 *
 * Second argument may be latitude (number) OR options `{ referenceCoordinates }`.
 */
export function normalizeLocationInput(input, latArgOrOptions) {
  let longitude;
  let latitude;
  const options =
    latArgOrOptions &&
    typeof latArgOrOptions === "object" &&
    !Array.isArray(latArgOrOptions)
      ? latArgOrOptions
      : {};
  const referenceCoordinates = options.referenceCoordinates || null;

  if (isFiniteNumber(input) && isFiniteNumber(latArgOrOptions)) {
    longitude = input;
    latitude = latArgOrOptions;
  } else if (Array.isArray(input) && input.length === 2) {
    [longitude, latitude] = resolveLngLatPair(input, referenceCoordinates);
  } else if (input && typeof input === "object") {
    if (input.lng != null || input.lat != null) {
      longitude = Number(input.lng);
      latitude = Number(input.lat);
    } else if (input.longitude != null || input.latitude != null) {
      longitude = Number(input.longitude);
      latitude = Number(input.latitude);
    } else if (Array.isArray(input.coordinates) && input.coordinates.length === 2) {
      [longitude, latitude] = resolveLngLatPair(
        input.coordinates,
        referenceCoordinates,
      );
    }
  }

  if (!isValidCoordinatePair(longitude, latitude)) {
    throw new Error(
      "Invalid coordinates. Expected longitude [-180,180] and latitude [-90,90]",
    );
  }

  return {
    longitude,
    latitude,
    location: buildGeoPoint(longitude, latitude),
    coordinates: [longitude, latitude],
  };
}

/**
 * Dual-write payload: canonical GeoJSON + legacy scalar aliases + freshness.
 */
export function buildLocationSetPayload(input, latArg, options = {}) {
  const normalized = normalizeLocationInput(input, latArg);
  const updatedAt = options.updatedAt || new Date();

  const payload = {
    location: normalized.location,
    longitude: normalized.longitude,
    latitude: normalized.latitude,
    coordinates: normalized.coordinates,
    locationUpdatedAt: updatedAt,
  };

  if (options.includeThrottleTimestamp) {
    payload.lastLocationUpdateTime = updatedAt;
  }

  if (options.includeLastOnline) {
    payload.lastOnline = updatedAt;
  }

  return payload;
}

export function applyLocationToDocument(doc, input, latArg, options = {}) {
  const payload = buildLocationSetPayload(input, latArg, options);
  doc.location = payload.location;
  doc.longitude = payload.longitude;
  doc.latitude = payload.latitude;
  doc.locationUpdatedAt = payload.locationUpdatedAt;
  if (options.includeThrottleTimestamp) {
    doc.lastLocationUpdateTime = payload.lastLocationUpdateTime;
  }
  if (options.includeLastOnline) {
    doc.lastOnline = payload.lastOnline;
  }
  return payload;
}

export function locationFieldsMatch(doc) {
  if (!doc) return false;
  if (!isValidGeoPoint(doc.location)) return false;
  if (!isValidCoordinatePair(doc.longitude, doc.latitude)) return false;
  const [lng, lat] = doc.location.coordinates;
  return lng === doc.longitude && lat === doc.latitude;
}

export function deriveScalarAliasesFromLocation(location) {
  if (!isValidGeoPoint(location)) {
    return { longitude: undefined, latitude: undefined, coordinates: undefined };
  }
  return {
    longitude: location.coordinates[0],
    latitude: location.coordinates[1],
    coordinates: [...location.coordinates],
  };
}
