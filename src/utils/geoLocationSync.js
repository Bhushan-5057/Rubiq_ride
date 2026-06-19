export const isValidGeoPoint = (point) =>
  point &&
  Array.isArray(point.coordinates) &&
  point.coordinates.length === 2 &&
  point.coordinates.every((coord) => typeof coord === "number");

export const buildGeoPoint = (coordinates) => ({
  type: "Point",
  coordinates: [coordinates[0], coordinates[1]],
});

export const normalizeGeoPoint = (point) => {
  if (!isValidGeoPoint(point)) {
    return undefined;
  }
  return buildGeoPoint(point.coordinates);
};

const getUpdateContext = (update) => {
  const set = update.$set ? update.$set : update;
  const unset = update.$unset || {};
  return { root: update, set, unset };
};

const hasUpdateField = (update, field) =>
  (update.$set && Object.prototype.hasOwnProperty.call(update.$set, field)) ||
  Object.prototype.hasOwnProperty.call(update, field);

const getUpdateValue = (update, field) => {
  if (update.$set && Object.prototype.hasOwnProperty.call(update.$set, field)) {
    return update.$set[field];
  }
  if (Object.prototype.hasOwnProperty.call(update, field)) {
    return update[field];
  }
  return undefined;
};

const hasUnsetField = (update, field) =>
  update && Object.prototype.hasOwnProperty.call(update, field);

export const syncGeoFieldsFromLocation = (doc, location, options = {}) => {
  const normalizedLocation = normalizeGeoPoint(location);
  const {
    locationField = "location",
    longitudeField = "longitude",
    latitudeField = "latitude",
  } = options;

  if (!normalizedLocation) {
    doc[locationField] = undefined;
    doc[longitudeField] = undefined;
    doc[latitudeField] = undefined;
    return;
  }

  doc[locationField] = normalizedLocation;
  doc[longitudeField] = normalizedLocation.coordinates[0];
  doc[latitudeField] = normalizedLocation.coordinates[1];
};

export const syncGeoFieldsFromCoords = (
  doc,
  longitude,
  latitude,
  options = {},
) => {
  const { locationField = "location" } = options;

  if (longitude != null && latitude != null) {
    doc[locationField] = buildGeoPoint([longitude, latitude]);
  } else {
    doc[locationField] = undefined;
  }
};

export const createSaveGeoSyncMiddleware = (
  options = {
    locationField: "location",
    longitudeField: "longitude",
    latitudeField: "latitude",
  },
) => {
  const {
    locationField = "location",
    longitudeField = "longitude",
    latitudeField = "latitude",
  } = options;

  return function (next) {
    const locationChanged = this.isModified(locationField);
    const coordsChanged =
      this.isModified(longitudeField) || this.isModified(latitudeField);

    if (locationChanged) {
      syncGeoFieldsFromLocation(this, this[locationField], options);
    } else if (coordsChanged) {
      syncGeoFieldsFromCoords(
        this,
        this[longitudeField],
        this[latitudeField],
        options,
      );
    }

    if (this[locationField] && !isValidGeoPoint(this[locationField])) {
      this[locationField] = undefined;
    }

    next();
  };
};

export const createQueryGeoSyncMiddleware = (
  {
    modelName = "Model",
    locationField = "location",
    longitudeField = "longitude",
    latitudeField = "latitude",
  } = {},
) => {
  return async function (next) {
    const update = this.getUpdate();
    if (!update) return next();

    const { root } = getUpdateContext(update);

    const hasLocation = hasUpdateField(update, locationField);
    const hasLon = hasUpdateField(update, longitudeField);
    const hasLat = hasUpdateField(update, latitudeField);
    const locationUnset = hasUnsetField(update.$unset, locationField);

    const location = getUpdateValue(update, locationField);
    let longitude = getUpdateValue(update, longitudeField);
    let latitude = getUpdateValue(update, latitudeField);

    if (hasLocation) {
      const normalizedLocation = normalizeGeoPoint(location);
      if (normalizedLocation) {
        if (root.$set) {
          root.$set[locationField] = normalizedLocation;
          root.$set[longitudeField] = normalizedLocation.coordinates[0];
          root.$set[latitudeField] = normalizedLocation.coordinates[1];
        } else {
          root[locationField] = normalizedLocation;
          root[longitudeField] = normalizedLocation.coordinates[0];
          root[latitudeField] = normalizedLocation.coordinates[1];
        }
      } else {
        if (root.$set) {
          delete root.$set[locationField];
          delete root.$set[longitudeField];
          delete root.$set[latitudeField];
          root.$unset = {
            ...(root.$unset || {}),
            [locationField]: 1,
            [longitudeField]: 1,
            [latitudeField]: 1,
          };
        } else {
          root[locationField] = undefined;
          root[longitudeField] = undefined;
          root[latitudeField] = undefined;
        }
      }

      return next();
    }

    if (locationUnset && !hasLon && !hasLat) {
      if (root.$set) {
        delete root.$set[locationField];
        root.$unset = {
          ...(root.$unset || {}),
          [locationField]: 1,
          [longitudeField]: 1,
          [latitudeField]: 1,
        };
      } else {
        root[locationField] = undefined;
        root[longitudeField] = undefined;
        root[latitudeField] = undefined;
      }
      return next();
    }

    if (hasLon || hasLat) {
      const explicitPartialUpdate =
        (hasLon && !hasLat) || (hasLat && !hasLon);

      if (explicitPartialUpdate) {
        if (this.op === "updateMany") {
          throw new Error(
            `Partial ${longitudeField}/${latitudeField} updates are not allowed for updateMany on ${modelName}`,
          );
        }

        const existing = await this.model
          .findOne(this.getQuery())
          .select(`${longitudeField} ${latitudeField}`)
          .lean();

        if (existing) {
          if (!hasLon) {
            longitude = existing[longitudeField];
          }
          if (!hasLat) {
            latitude = existing[latitudeField];
          }
        }
      }

      if (longitude != null && latitude != null) {
        const normalizedLocation = buildGeoPoint([longitude, latitude]);
        if (root.$set) {
          root.$set[locationField] = normalizedLocation;
          root.$set[longitudeField] = longitude;
          root.$set[latitudeField] = latitude;
        } else {
          root[locationField] = normalizedLocation;
          root[longitudeField] = longitude;
          root[latitudeField] = latitude;
        }
      } else if (root.$set) {
        delete root.$set[locationField];
        root.$unset = {
          ...(root.$unset || {}),
          [locationField]: 1,
        };
      } else {
        root[locationField] = undefined;
      }
    }

    next();
  };
};
