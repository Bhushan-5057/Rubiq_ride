import { isDriverProfileComplete, requiredDocsNumber, updatableFields } from "../../../common/utlis.js";
import { getDriverStats } from "../../../services/rideServices/rideStats.service.js"
import { Driver } from "../../../models/driver/driver.model.js"
import { Ride } from "../../../models/ride/ride.model.js";
import { sendEmail, renderTemplate } from "../../../utils/mailer.js";
import { normalizeDriverMediaUrls } from "../../../utils/mediaUrl.js";
import {
  DRIVER_APPROVAL_STATUS,
  DRIVER_AVAILABILITY_STATUS,
  USER_STATUS,
} from "../../../constants/userStatus.constants.js";
import { isDriverReadyForRide } from "../../../helpers/driverStatus.helper.js";

const driverDocumentFileFields = [
  "aadhaarFront",
  "aadhaarBack",
  "panFront",
  "licenseFront",
  "licenseBack",
  "rcFront",
  "rcBack",
  "insurance",
];

const containsAmazonAwsUrl = (value) =>
  typeof value === "string" && /^https?:\/\/[^/]*amazonaws\.com\//i.test(value);

const assertNoRawS3MediaValues = (data = {}) => {
  if (containsAmazonAwsUrl(data.profileImage)) {
    throw new Error("profileImage must be stored as an S3 key or CloudFront URL, not an amazonaws.com URL");
  }

  if (!data.documents || typeof data.documents !== "object") return;

  driverDocumentFileFields.forEach((field) => {
    if (containsAmazonAwsUrl(data.documents[field])) {
      throw new Error(`${field} must be stored as an S3 key or CloudFront URL, not an amazonaws.com URL`);
    }
  });
};


//---------------------- Driver Online ----------------------
export const setDriverOnlineService = async (driverId) => {
  try {
    const driver = await Driver.findById(driverId);
    if (!driver) {
      throw new Error("Driver not found");
    }
    if (driver.approvalStatus !== DRIVER_APPROVAL_STATUS.APPROVED) {
      throw new Error("Driver is not approved to go online");
    }
    if (driver.profileCompleted !== true) {
      throw new Error("Driver profile is not completed");
    }
    if (driver.documentsVerified !== true) {
      throw new Error("Driver documents are not verified");
    }
    if (driver.status !== USER_STATUS.ACTIVE) {
      throw new Error("Driver account is not active");
    }
    if (!isDriverReadyForRide(driver)) {
      throw new Error("Driver is not ready to go online");
    }
    driver.isOnline = true;
    driver.driverStatus = DRIVER_AVAILABILITY_STATUS.AVAILABLE;
    driver.lastOnline = new Date();
    await driver.save();
    return driver;
  } catch (error) {
    throw error;
  }
}

//---------------------- Driver Offline ----------------------
export const setDriverOfflineService = async (driverId) => {
  try {
    const driver = await Driver.findById(driverId);
    if (!driver) {
      throw new Error("Driver not found");
    }

    if (driver.driverStatus === DRIVER_AVAILABILITY_STATUS.ON_TRIP) {
      throw new Error("Cannot go offline while on a trip");
    }

    const selectedRides = await Ride.find({ driver: driverId, status: { $in: ["accepted", "ongoing"] } });
    if (selectedRides.length > 0) {
      throw new Error("Cannot go offline with active rides");
    }

    driver.isOnline = false;
    driver.driverStatus = DRIVER_AVAILABILITY_STATUS.UNAVAILABLE;
    driver.lastOffline = new Date();
    await driver.save();
    return driver;
  } catch (error) {
    throw error;
  }
}

//----------------------- Get Profile -----------------------
export async function getProfile(driver) {
  if (!driver) throw new Error("Driver not found");

  const result = normalizeDriverMediaUrls(driver.toObject ? driver.toObject() : driver);

  delete result.password;
  delete result.otp;
  delete result.otpExpiry;
  delete result.__v;

  // Add ride statistics to the profile result
  const stats = await getDriverStats(driver._id);
  result.getDriverStats = stats;

  return result;
}

//----------------------- Update Profile -----------------------
export async function updateProfile(driver, data = {}) {
  if (!driver) throw new Error("Driver not found");

  assertNoRawS3MediaValues(data);

  const wasProfileCompleted = driver.profileCompleted;

  if (typeof data.dateOfBirth === "string" && data.dateOfBirth.trim() === "") {
    driver.dateOfBirth = null;
    delete data.dateOfBirth;
  }

  updatableFields.forEach((field) => {
    if (data[field] !== undefined) driver[field] = data[field];
  });

  // Map plain number fields from body into documents subdocument
  const numberDocFields = requiredDocsNumber;

  if (!driver.documents) {
    driver.documents = {};
  }

  numberDocFields.forEach((field) => {
    if (data[field] !== undefined) {
      driver.documents[field] = data[field];
    }
  });

  if (data.documents && typeof data.documents === "object") {

    driver.documents = { ...(driver.documents || {}), ...data.documents };

    const docToStatusMap = {
      aadhaarFront: "aadhaarStatus",
      aadhaarBack: "aadhaarStatus",
      panFront: "panStatus",
      licenseFront: "licenseStatus",
      licenseBack: "licenseStatus",
      rcFront: "rcStatus",
      rcBack: "rcStatus",
      insurance: "insuranceStatus",
    };

    Object.keys(data.documents).forEach((docKey) => {
      const statusKey = docToStatusMap[docKey];
      if (!statusKey) return;
      const currentStatus = driver.documents[statusKey];
      if (!currentStatus || currentStatus === "not_uploaded" || currentStatus === "rejected") {
        driver.documents[statusKey] = "pending";
      }
    });
  }

  driver.profileCompleted = isDriverProfileComplete(driver); 

  const forceEmail = data.forceEmail === true;

// true only when profile transitions from false → true
const profileJustCompleted =
  !wasProfileCompleted && driver.profileCompleted === true;

// Decide if email is allowed to send
const shouldSendEmail =
  driver.email &&
  (
    // normal production flow
    (profileJustCompleted && !driver.welcomeEmailSent) ||
    // testing flow
    forceEmail
  );

console.log({
  wasProfileCompleted,
  profileCompleted: driver.profileCompleted,
  profileJustCompleted,
  welcomeEmailSent: driver.welcomeEmailSent,
  forceEmail,
});

if (shouldSendEmail) {
  try {
    const html = renderTemplate("driver.welcome.html", {
      name: driver.name || "Driver",
      year: new Date().getFullYear(),
    });

    await sendEmail({
      to: driver.email,
      subject: "Welcome to Rubiq Ride – You’re Ready to Drive 🚗",
      html,
    });

    // Only mark sent in real flow
    if (!forceEmail) {
      driver.welcomeEmailSent = true;
    }
  } catch (err) {
    console.error("Welcome email failed:", err.message);
  }
}

  driver.updatedAt = new Date();
  await driver.save();

  const result = normalizeDriverMediaUrls(driver.toObject ? driver.toObject() : driver);
  delete result.password;
  delete result.otp;
  delete result.otpExpiry;
  delete result.__v;

  return result;
}

//----------------------- Delete Profile -----------------------
export async function deleteProfile(driver) {
  if (!driver) throw new Error("Driver not found");

  driver.status = USER_STATUS.INACTIVE;
  driver.isOnline = false;
  driver.driverStatus = DRIVER_AVAILABILITY_STATUS.UNAVAILABLE;
  await driver.save();

  return { message: "Driver profile deleted successfully" };
}
