import axios from "axios";

const GOOGLE_MAPS_BASE_URL = "https://maps.googleapis.com/maps/api";
const DEFAULT_REGION = "in";
const DEFAULT_LANGUAGE = "en";
const DEFAULT_CACHE_TTL_MS = 10 * 60 * 1000;
const AUTOCOMPLETE_CACHE_TTL_MS = 60 * 1000;
const cache = new Map();

class GoogleMapsError extends Error {
  constructor(message, details = undefined, status = 502) {
    super(message);
    this.name = "GoogleMapsError";
    this.details = details;
    this.status = status;
  }
}

function getApiKey() {
  return process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY;
}

function requireApiKey() {
  const key = getApiKey();
  if (!key) {
    throw new GoogleMapsError("Google Maps API key is not configured", undefined, 500);
  }
  return key;
}

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function setCached(key, value, ttlMs = DEFAULT_CACHE_TTL_MS) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

function asNumber(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new GoogleMapsError(`${field} must be a valid number`, undefined, 400);
  }
  return number;
}

export function normalizePoint(point, field = "location") {
  if (!point) {
    throw new GoogleMapsError(`${field} is required`, undefined, 400);
  }

  if (typeof point === "string") {
    return point;
  }

  if (Array.isArray(point)) {
    if (point.length !== 2) {
      throw new GoogleMapsError(`${field} coordinates must contain [lng, lat]`, undefined, 400);
    }
    const lng = asNumber(point[0], `${field}.lng`);
    const lat = asNumber(point[1], `${field}.lat`);
    return { lat, lng };
  }

  if (Array.isArray(point.coordinates)) {
    return normalizePoint(point.coordinates, field);
  }

  const lat = asNumber(point.lat ?? point.latitude, `${field}.lat`);
  const lng = asNumber(point.lng ?? point.longitude, `${field}.lng`);
  return { lat, lng };
}

function pointToGoogleParam(point, field) {
  const normalized = normalizePoint(point, field);
  if (typeof normalized === "string") return normalized;
  return `${normalized.lat},${normalized.lng}`;
}

function pointToGeoJsonCoordinates(point, field) {
  const normalized = normalizePoint(point, field);
  if (typeof normalized === "string") {
    throw new GoogleMapsError(`${field} must include coordinates`, undefined, 400);
  }
  return [normalized.lng, normalized.lat];
}

function formatLocation(location) {
  if (!location) return undefined;
  const normalized = normalizePoint(location, "location");
  if (typeof normalized === "string") return undefined;
  return `${normalized.lat},${normalized.lng}`;
}

async function requestGoogle(path, params, cacheKey = null, ttlMs = DEFAULT_CACHE_TTL_MS) {
  if (cacheKey) {
    const cached = getCached(cacheKey);
    if (cached) return cached;
  }

  const { data } = await axios.get(`${GOOGLE_MAPS_BASE_URL}${path}`, {
    params: {
      ...params,
      key: requireApiKey(),
    },
    timeout: Number(process.env.GOOGLE_MAPS_TIMEOUT_MS || 8000),
  });

  if (!data || (data.status && !["OK", "ZERO_RESULTS"].includes(data.status))) {
    throw new GoogleMapsError(
      data?.error_message || `Google Maps request failed with status ${data?.status || "UNKNOWN"}`,
      { googleStatus: data?.status },
      502
    );
  }

  if (cacheKey) setCached(cacheKey, data, ttlMs);
  return data;
}

function normalizeDistanceValue(distance) {
  return {
    text: distance?.text || null,
    meters: Number.isFinite(distance?.value) ? distance.value : null,
    km: Number.isFinite(distance?.value) ? Number((distance.value / 1000).toFixed(2)) : null,
  };
}

function normalizeDurationValue(duration) {
  return {
    text: duration?.text || null,
    seconds: Number.isFinite(duration?.value) ? duration.value : null,
    minutes: Number.isFinite(duration?.value) ? Math.max(1, Math.round(duration.value / 60)) : null,
  };
}

function normalizeDirectionsRoute(route) {
  const legs = route.legs || [];
  const distanceMeters = legs.reduce((sum, leg) => sum + (leg.distance?.value || 0), 0);
  const durationSeconds = legs.reduce((sum, leg) => sum + (leg.duration?.value || 0), 0);
  const durationInTrafficSeconds = legs.reduce(
    (sum, leg) => sum + (leg.duration_in_traffic?.value || leg.duration?.value || 0),
    0
  );

  return {
    summary: route.summary,
    distance: normalizeDistanceValue({ value: distanceMeters, text: `${(distanceMeters / 1000).toFixed(1)} km` }),
    duration: normalizeDurationValue({ value: durationSeconds, text: `${Math.round(durationSeconds / 60)} mins` }),
    durationInTraffic: normalizeDurationValue({
      value: durationInTrafficSeconds,
      text: `${Math.round(durationInTrafficSeconds / 60)} mins`,
    }),
    polyline: route.overview_polyline?.points || null,
    bounds: route.bounds || null,
    copyrights: route.copyrights || null,
    warnings: route.warnings || [],
    legs: legs.map((leg) => ({
      startAddress: leg.start_address,
      endAddress: leg.end_address,
      startLocation: leg.start_location,
      endLocation: leg.end_location,
      distance: normalizeDistanceValue(leg.distance),
      duration: normalizeDurationValue(leg.duration),
      durationInTraffic: normalizeDurationValue(leg.duration_in_traffic || leg.duration),
      steps: (leg.steps || []).map((step) => ({
        distance: normalizeDistanceValue(step.distance),
        duration: normalizeDurationValue(step.duration),
        startLocation: step.start_location,
        endLocation: step.end_location,
        polyline: step.polyline?.points || null,
        travelMode: step.travel_mode,
        maneuver: step.maneuver || null,
        instruction: step.html_instructions || null,
      })),
    })),
  };
}

export function clearGoogleMapsCache() {
  cache.clear();
}

export async function autocompletePlaces({
  input,
  sessionToken,
  location,
  radius,
  language = DEFAULT_LANGUAGE,
  region = DEFAULT_REGION,
  components = "country:in",
}) {
  const trimmedInput = (input || "").trim();
  if (trimmedInput.length < 2) {
    return { predictions: [] };
  }

  const cacheKey = `places:auto:${trimmedInput.toLowerCase()}:${sessionToken || ""}:${location || ""}:${radius || ""}`;
  const data = await requestGoogle(
    "/place/autocomplete/json",
    {
      input: trimmedInput,
      sessiontoken: sessionToken,
      language,
      region,
      components,
      location: formatLocation(location),
      radius: location ? Number(radius) || 50000 : undefined,
    },
    cacheKey,
    AUTOCOMPLETE_CACHE_TTL_MS
  );

  return {
    predictions: (data.predictions || []).map((prediction) => ({
      placeId: prediction.place_id,
      description: prediction.description,
      mainText: prediction.structured_formatting?.main_text,
      secondaryText: prediction.structured_formatting?.secondary_text,
      types: prediction.types || [],
    })),
  };
}

export async function getPlaceDetails({
  placeId,
  sessionToken,
  language = DEFAULT_LANGUAGE,
  fields = "place_id,formatted_address,geometry,name,types,address_components",
}) {
  if (!placeId) {
    throw new GoogleMapsError("placeId is required", undefined, 400);
  }

  const data = await requestGoogle(
    "/place/details/json",
    {
      place_id: placeId,
      sessiontoken: sessionToken,
      fields,
      language,
    },
    `places:details:${placeId}:${fields}`,
    DEFAULT_CACHE_TTL_MS
  );

  const result = data.result || {};
  return {
    placeId: result.place_id,
    name: result.name,
    address: result.formatted_address,
    location: result.geometry?.location || null,
    coordinates: result.geometry?.location
      ? [result.geometry.location.lng, result.geometry.location.lat]
      : null,
    types: result.types || [],
    addressComponents: result.address_components || [],
  };
}

export async function geocodeAddress({ address, language = DEFAULT_LANGUAGE, region = DEFAULT_REGION }) {
  if (!address || !address.trim()) {
    throw new GoogleMapsError("address is required", undefined, 400);
  }

  const data = await requestGoogle(
    "/geocode/json",
    { address: address.trim(), language, region },
    `geocode:address:${address.trim().toLowerCase()}:${language}:${region}`,
    DEFAULT_CACHE_TTL_MS
  );

  return (data.results || []).map((result) => ({
    placeId: result.place_id,
    address: result.formatted_address,
    location: result.geometry?.location || null,
    coordinates: result.geometry?.location
      ? [result.geometry.location.lng, result.geometry.location.lat]
      : null,
    types: result.types || [],
    addressComponents: result.address_components || [],
  }));
}

export async function reverseGeocode({ lat, lng, language = DEFAULT_LANGUAGE }) {
  const point = normalizePoint({ lat, lng }, "location");
  const data = await requestGoogle(
    "/geocode/json",
    { latlng: `${point.lat},${point.lng}`, language },
    `geocode:reverse:${point.lat},${point.lng}:${language}`,
    DEFAULT_CACHE_TTL_MS
  );

  return (data.results || []).map((result) => ({
    placeId: result.place_id,
    address: result.formatted_address,
    location: result.geometry?.location || null,
    coordinates: result.geometry?.location
      ? [result.geometry.location.lng, result.geometry.location.lat]
      : null,
    types: result.types || [],
    addressComponents: result.address_components || [],
  }));
}

export async function getDirections({
  origin,
  destination,
  waypoints = [],
  mode = "driving",
  alternatives = false,
  departureTime = "now",
  language = DEFAULT_LANGUAGE,
}) {
  const originParam = pointToGoogleParam(origin, "origin");
  const destinationParam = pointToGoogleParam(destination, "destination");
  const waypointParam = Array.isArray(waypoints) && waypoints.length
    ? waypoints.map((waypoint) => pointToGoogleParam(waypoint, "waypoint")).join("|")
    : undefined;

  const data = await requestGoogle(
    "/directions/json",
    {
      origin: originParam,
      destination: destinationParam,
      waypoints: waypointParam,
      mode,
      alternatives,
      departure_time: departureTime,
      language,
    },
    `directions:${originParam}:${destinationParam}:${waypointParam || ""}:${mode}`,
    2 * 60 * 1000
  );

  return {
    routes: (data.routes || []).map(normalizeDirectionsRoute),
    geocodedWaypoints: data.geocoded_waypoints || [],
  };
}

export async function getPrimaryRoute(options) {
  const directions = await getDirections(options);
  const route = directions.routes[0];
  if (!route) {
    throw new GoogleMapsError("No route found between pickup and destination", undefined, 404);
  }
  return route;
}

export async function getDistanceMatrix({
  origins,
  destinations,
  mode = "driving",
  departureTime = "now",
  language = DEFAULT_LANGUAGE,
}) {
  if (!Array.isArray(origins) || origins.length === 0) {
    throw new GoogleMapsError("origins must be a non-empty array", undefined, 400);
  }
  if (!Array.isArray(destinations) || destinations.length === 0) {
    throw new GoogleMapsError("destinations must be a non-empty array", undefined, 400);
  }
  if (origins.length * destinations.length > 25) {
    throw new GoogleMapsError("Distance Matrix requests are limited to 25 origin/destination pairs", undefined, 400);
  }

  const originParam = origins.map((origin) => pointToGoogleParam(origin, "origin")).join("|");
  const destinationParam = destinations.map((destination) => pointToGoogleParam(destination, "destination")).join("|");
  const data = await requestGoogle(
    "/distancematrix/json",
    {
      origins: originParam,
      destinations: destinationParam,
      mode,
      departure_time: departureTime,
      language,
    },
    `matrix:${originParam}:${destinationParam}:${mode}`,
    60 * 1000
  );

  return {
    originAddresses: data.origin_addresses || [],
    destinationAddresses: data.destination_addresses || [],
    rows: (data.rows || []).map((row) => ({
      elements: (row.elements || []).map((element) => ({
        status: element.status,
        distance: normalizeDistanceValue(element.distance),
        duration: normalizeDurationValue(element.duration),
        durationInTraffic: normalizeDurationValue(element.duration_in_traffic || element.duration),
      })),
    })),
  };
}

export async function getDriverEtasToDestination(drivers, destination) {
  const availableDrivers = drivers
    .filter((driver) => driver?.location?.coordinates?.length === 2)
    .slice(0, 25);
  if (!availableDrivers.length) return [];

  const matrix = await getDistanceMatrix({
    origins: availableDrivers.map((driver) => driver.location.coordinates),
    destinations: [destination],
  });

  return availableDrivers.map((driver, index) => {
    const element = matrix.rows[index]?.elements?.[0];
    return {
      driverId: driver._id,
      distance: element?.distance || null,
      duration: element?.duration || null,
      durationInTraffic: element?.durationInTraffic || null,
      status: element?.status || "UNKNOWN",
    };
  });
}

export async function resolveRideLocation(location, field) {
  if (!location) {
    throw new GoogleMapsError(`${field} is required`, undefined, 400);
  }

  if (location.placeId) {
    const details = await getPlaceDetails({ placeId: location.placeId, sessionToken: location.sessionToken });
    if (!details.coordinates) {
      throw new GoogleMapsError(`${field} place does not include coordinates`, undefined, 400);
    }
    return {
      address: location.address || details.address || details.name,
      coordinates: details.coordinates,
      lat: details.location.lat,
      lng: details.location.lng,
      placeId: details.placeId,
    };
  }

  if (location.lat !== undefined || location.lng !== undefined || location.coordinates) {
    const coordinates = pointToGeoJsonCoordinates(location, field);
    let address = location.address;
    if (!address) {
      const results = await reverseGeocode({ lat: coordinates[1], lng: coordinates[0] });
      address = results[0]?.address || "";
    }
    return {
      address,
      coordinates,
      lat: coordinates[1],
      lng: coordinates[0],
      placeId: location.placeId,
    };
  }

  if (location.address) {
    const results = await geocodeAddress({ address: location.address });
    if (!results[0]?.coordinates) {
      throw new GoogleMapsError(`Unable to geocode ${field} address`, undefined, 400);
    }
    return {
      address: results[0].address,
      coordinates: results[0].coordinates,
      lat: results[0].location.lat,
      lng: results[0].location.lng,
      placeId: results[0].placeId,
    };
  }

  throw new GoogleMapsError(`${field} must include placeId, address, or coordinates`, undefined, 400);
}

export { GoogleMapsError };
