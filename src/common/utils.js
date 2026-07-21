import jwt from "jsonwebtoken";

// Function to generate a 6-digit OTP
export function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// OTP expiry time in minutes
export const OTP_EXPIRY_MINUTES = 5;

// Fields that can be updated dynamically in Driver Profile
export const updatableFields = [
  "name",
  "email",
  "vehicleNumber",
  "dateOfBirth",
  "gender",
  "vehicleType",
  "city",
  "profileImage",
  "contactNumber",
];

// Fields required to mark profile as complete for driver
export const requiredFields = [
  "name",
  "email",
  "vehicleNumber",
  "dateOfBirth",
  "gender",
  "vehicleType",
  "city",
  "profileImage",
];

// Fields required to mark profile as complete for passenger
export const requiredPassengerFields = ["name", "email", "gender"];

// Document fields required for driver verification
export const requiredDocs = [
  "aadhaarFront",
  "aadhaarBack",
  "panFront",
  "licenseFront",
  "licenseBack",
  "rcFront",
  "rcBack",
];

// Document numbers required for driver verification
export const requiredDocsNumber = [
  "aadhaarNumber",
  "panNumber",
  "licenseNumber",
  "rcNumber",
];

// Document status fields for driver verification
export const documentStatus = [
  "aadhaarStatus",
  "panStatus",
  "licenseStatus",
  "rcStatus",
];

// Fields that can be updated dynamically in Passenger Profile
export const passengerfields = [
  "name",
  "email",
  "gender",
  "contactNumber",
  "dateOfBirth",
  "profileImage",
];

export function isFilled(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (value instanceof Date) return !isNaN(value.getTime());
  return Boolean(value);
}

export function isPassengerProfileComplete(passenger = {}) {
  return requiredPassengerFields.every((field) => isFilled(passenger[field]));
}

/**
 * Snapshot of every document field used for profile completion checks.
 * Safe for logging (shows presence, not full S3 URLs when very long).
 */
export function getDriverDocumentsSnapshot(driver = {}) {
  const docs =
    typeof driver.documents?.toObject === "function"
      ? driver.documents.toObject()
      : { ...(driver.documents || {}) };

  const fileFields = Object.fromEntries(
    requiredDocs.map((key) => [
      key,
      {
        present: isFilled(docs[key]),
        value: isFilled(docs[key]) ? String(docs[key]).slice(0, 80) : null,
      },
    ]),
  );

  const numberFields = Object.fromEntries(
    requiredDocsNumber.map((key) => [
      key,
      {
        present: isFilled(docs[key]),
        value: isFilled(docs[key]) ? String(docs[key]) : null,
      },
    ]),
  );

  const statusFields = Object.fromEntries(
    documentStatus.map((key) => [key, docs[key] || "not_uploaded"]),
  );

  return { fileFields, numberFields, statusFields, raw: docs };
}

/**
 * Detailed breakdown of why profileCompleted is true/false.
 * profileCompleted = profile fields + doc files + doc numbers uploaded.
 * Admin approval is tracked separately via documentsVerified / approvalStatus.
 */
export function explainDriverProfileCompletion(driver = {}) {
  const docsSnapshot = getDriverDocumentsSnapshot(driver);

  const fieldChecks = Object.fromEntries(
    requiredFields.map((field) => [
      field,
      {
        present: isFilled(driver[field]),
        value: isFilled(driver[field])
          ? String(driver[field]).slice(0, 80)
          : null,
      },
    ]),
  );

  const missingFields = requiredFields.filter(
    (field) => !isFilled(driver[field]),
  );
  const missingDocs = requiredDocs.filter(
    (docKey) => !docsSnapshot.fileFields[docKey].present,
  );
  const missingDocNumbers = requiredDocsNumber.filter(
    (numKey) => !docsSnapshot.numberFields[numKey].present,
  );
  const unapprovedStatuses = documentStatus.filter(
    (statusKey) => docsSnapshot.statusFields[statusKey] !== "approved",
  );

  const allFieldsFilled = missingFields.length === 0;
  const allDocsUploaded = missingDocs.length === 0;
  const allDocNumbersPresent = missingDocNumbers.length === 0;
  const allDocsApproved = unapprovedStatuses.length === 0;

  // Profile is "complete" once the driver submitted everything.
  // Going online still requires documentsVerified + approvalStatus separately.
  const profileCompleted =
    allFieldsFilled && allDocsUploaded && allDocNumbersPresent;

  return {
    profileCompleted,
    conditions: {
      allFieldsFilled,
      allDocsUploaded,
      allDocNumbersPresent,
      allDocsApproved,
    },
    missing: {
      fields: missingFields,
      documentFiles: missingDocs,
      documentNumbers: missingDocNumbers,
      unapprovedStatuses,
    },
    fieldChecks,
    documents: docsSnapshot,
    goOnlineAlsoRequires: {
      approvalStatus: "approved",
      documentsVerified: true,
      status: "active",
      note: "These are separate from profileCompleted and are set by admin document verification.",
    },
  };
}

export function isDriverProfileComplete(driver = {}) {
  return explainDriverProfileCompletion(driver).profileCompleted;
}

export function logDriverProfileCompletion(driver = {}, context = "profile") {
  const explanation = explainDriverProfileCompletion(driver);
  console.log(`[DriverProfileCompletion:${context}]`, {
    driverId: driver?._id?.toString?.() || driver?._id || null,
    profileCompleted: explanation.profileCompleted,
    conditions: explanation.conditions,
    missing: explanation.missing,
    profileFields: explanation.fieldChecks,
    documentFiles: explanation.documents.fileFields,
    documentNumbers: explanation.documents.numberFields,
    documentStatuses: explanation.documents.statusFields,
    goOnlineAlsoRequires: explanation.goOnlineAlsoRequires,
    driverFlags: {
      approvalStatus: driver?.approvalStatus,
      documentsVerified: driver?.documentsVerified,
      status: driver?.status,
      storedProfileCompleted: driver?.profileCompleted,
    },
  });
  return explanation;
}

// Haversine formula to calculate distance between two coordinates
export function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

export function getDistanceInMeters(coord1, coord2) {
  // Expecting coordinates in [longitude, latitude] format
  const [lng1, lat1] = coord1;
  const [lng2, lat2] = coord2;
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

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function areCoordinatesClose(coord1, coord2, thresholdMeters = 200) {
  try {
    // Both arrays must be GeoJSON order: [longitude, latitude]
    if (
      !Array.isArray(coord1) ||
      !Array.isArray(coord2) ||
      coord1.length !== 2 ||
      coord2.length !== 2
    ) {
      return false;
    }

    const distance = getDistanceInMeters(coord1, coord2);
    return distance <= thresholdMeters;
  } catch (error) {
    console.error("Error calculating distance:", error);
    return false;
  }
}
