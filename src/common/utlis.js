// import twilio from "twilio";
import jwt from "jsonwebtoken";

// Function to generate a 6-digit OTP
export function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// OTP expiry time in minutes
export const OTP_EXPIRY_MINUTES = 5;

// //twilo credentials
// export const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, NODE_ENV } =
//   process.env;

//  export const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

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
]

// Document status fields for driver verification
export const documentStatus = [
  "aadhaarStatus",
  "panStatus",
  "licenseStatus",
  "rcStatus",
  "insuranceStatus"
];

// Fields that can be updated dynamically in Passenger Profile
export const passengerfields = ["name", "email", "gender", "contactNumber", "dateOfBirth", "profileImage"];

//genrate otken for passenger 
export function generateToken(passenger) {
  const payload = { id: passenger._id };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });
}

// Haversine formula to calculate distance between two coordinates
export function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

export function getDistanceInMeters([lat1, lng1], [lat2, lng2]) {
  const R = 6371000;
  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const dPhi = toRadians(lat2 - lat1);
  const dLambda = toRadians(lng2 - lng1);

  const a =
    Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) *
    Math.sin(dLambda / 2) * Math.sin(dLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function areCoordinatesClose(coord1, coord2, thresholdMeters = 100) {
  const distance = getDistanceInMeters(coord1, coord2);
  return distance <= thresholdMeters;
}
