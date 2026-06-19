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
  "insurance",
];

// Document numbers required for driver verification
export const requiredDocsNumber = [
  "aadhaarNumber",
  "panNumber",
  "licenseNumber",
  "rcNumber",
  "insuranceNumber",
];

// Document status fields for driver verification
export const documentStatus = [
  "aadhaarStatus",
  "panStatus",
  "licenseStatus",
  "rcStatus",
  "insuranceStatus",
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

export function isDriverProfileComplete(driver = {}) {
  const allFieldsFilled = requiredFields.every((field) =>
    isFilled(driver[field]),
  );
  const allDocsUploaded = requiredDocs.every((docKey) =>
    isFilled(driver.documents?.[docKey]),
  );
  const allDocsApproved = documentStatus.every(
    (status) => driver.documents?.[status] === "approved",
  );
  const allDocNumbersPresent = requiredDocsNumber.every((numKey) =>
    isFilled(driver.documents?.[numKey]),
  );

  return (
    allFieldsFilled &&
    allDocsUploaded &&
    allDocsApproved &&
    allDocNumbersPresent
  );
}

//genrate otken for passenger
export function generateToken(passenger) {
  const payload = { id: passenger._id };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });
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
    // Ensure we have valid coordinate arrays
    if (
      !Array.isArray(coord1) ||
      !Array.isArray(coord2) ||
      coord1.length !== 2 ||
      coord2.length !== 2
    ) {
      return false;
    }

    const distance = getDistanceInMeters(coord1, coord2);
    const isClose = distance <= thresholdMeters;
    console.log(
      `Distance: ${distance.toFixed(2)}m, Threshold: ${thresholdMeters}m, Is Close: ${isClose}`,
    );
    return isClose;
  } catch (error) {
    console.error("Error calculating distance:", error);
    return false;
  }
}
