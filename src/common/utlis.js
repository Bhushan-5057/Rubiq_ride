import twilio from "twilio";

// Function to generate a 6-digit OTP
export function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// OTP expiry time in minutes
export const OTP_EXPIRY_MINUTES = 5;


//twilo credentials
export const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, NODE_ENV } =
  process.env;

 export const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);


// Fields that can be updated dynamically
export const updatableFields = [
  "name",
  "email",
  "vehicleNumber",
  "licenseNumber",
  "dateOfBirth",
  "gender",
  "vehicleType",
  "city",
  "profileImage",
];

// Fields required to mark profile as complete
export const requiredFields = [
  "name",
  "email",
  "vehicleNumber",
  "licenseNumber",
  "dateOfBirth",
  "gender",
  "vehicleType",
  "city",
  "profileImage",
];

// Document fields required
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

export const documentStatus = [
  "aadhaarStatus",
  "panStatus",
  "licenseStatus",
  "rcStatus",
  "insuranceStatus"
];

export const passengerfields = ["name", "email", "gender", "contactNumber",   "dateOfBirth", ,"profileImage"];


//genrate otken for passenger 
export function generateToken(passenger) {
  const payload = { id: passenger._id };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });
}

