import {
  autocompletePlaces,
  geocodeAddress,
  getDirections,
  getDistanceMatrix,
  getPlaceDetails,
  reverseGeocode,
} from "../../services/googleMaps/googleMaps.service.js";

function parseLocation(value) {
  if (!value) return undefined;
  if (typeof value !== "string") return value;
  const [lat, lng] = value.split(",").map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
  return { lat, lng };
}

export async function autocompleteController(req, res, next) {
  try {
    const result = await autocompletePlaces({
      input: req.query.input,
      sessionToken: req.query.sessionToken,
      location: parseLocation(req.query.location),
      radius: req.query.radius,
      language: req.query.language,
      region: req.query.region,
      components: req.query.components,
    });

    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function placeDetailsController(req, res, next) {
  try {
    const result = await getPlaceDetails({
      placeId: req.params.placeId || req.query.placeId,
      sessionToken: req.query.sessionToken,
      language: req.query.language,
    });

    res.json({ success: true, place: result });
  } catch (error) {
    next(error);
  }
}

export async function geocodeController(req, res, next) {
  try {
    const results = await geocodeAddress({
      address: req.query.address,
      language: req.query.language,
      region: req.query.region,
    });

    res.json({ success: true, results });
  } catch (error) {
    next(error);
  }
}

export async function reverseGeocodeController(req, res, next) {
  try {
    const results = await reverseGeocode({
      lat: req.query.lat,
      lng: req.query.lng,
      language: req.query.language,
    });

    res.json({ success: true, results });
  } catch (error) {
    next(error);
  }
}

export async function directionsController(req, res, next) {
  try {
    const result = await getDirections({
      origin: req.body.origin,
      destination: req.body.destination,
      waypoints: req.body.waypoints,
      mode: req.body.mode,
      alternatives: req.body.alternatives,
      departureTime: req.body.departureTime,
      language: req.body.language,
    });

    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function distanceMatrixController(req, res, next) {
  try {
    const result = await getDistanceMatrix({
      origins: req.body.origins,
      destinations: req.body.destinations,
      mode: req.body.mode,
      departureTime: req.body.departureTime,
      language: req.body.language,
    });

    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}
