import { requiredFields, updatableFields, documentStatus, requiredDocs, requiredDocsNumber } from "../../../common/utlis.js";
import { getDriverStats } from "../../../services/rideServices/rideStats.service.js"
import { Driver } from "../../../models/driver/driver.model.js"
import { Ride } from "../../../models/ride/ride.model.js";
import { sendEmail, renderTemplate } from "../../../utils/mailer.js";


//---------------------- Driver Online ----------------------
export const setDriverOnlineService = async (driverId) => {
  try {
    const driver = await Driver.findById(driverId);
    if (!driver) {
      throw new Error("Driver not found");
    }
    if (driver.activationStatus !== "ready") {
      throw new Error("Driver is not ready to go online");
    }

    if (driver.approvalStatus !== "approved") {
      throw new Error("Driver is not approved to go online");
    }
    if (driver.profileCompleted !== true) {
      throw new Error("Driver profile is not completed");
    }
    if (driver.documentsVerified !== true) {
      throw new Error("Driver documents are not verified");
    }
    if (driver.status !== "active") {
      throw new Error("Driver account is not active");
    }
    driver.isOnline = true;
    driver.driverStatus = "available";
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

    if (driver.driverStatus === "on_trip") {
      throw new Error("Cannot go offline while on a trip");
    }

    const selectedRides = await Ride.find({ driver: driverId, status: { $in: ["accepted", "ongoing"] } });
    if (selectedRides.length > 0) {
      throw new Error("Cannot go offline with active rides");
    }

    driver.isOnline = false;
    driver.driverStatus = "unavailable";
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

  const result = driver.toObject ? driver.toObject() : driver;

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

  const isFilled = (key, val) => {
    if (key === "dateOfBirth") {
      if (!val) return false;
      const d = new Date(val);
      return !isNaN(d.getTime());
    }
    if (typeof val === "string") return val.trim().length > 0;
    return Boolean(val);
  };

  const allFieldsFilled = requiredFields.every((field) => isFilled(field, driver[field]));
  const allDocsUploaded = requiredDocs.every((docKey) => Boolean(driver.documents?.[docKey]));
  const allDocsApproved = documentStatus.every((status) => driver.documents?.[status] === "approved");

  // Ensure all required document numbers are also present for profile completion
  const allDocNumbersPresent = requiredDocsNumber.every(
    (numKey) => Boolean(driver.documents?.[numKey])
  );

  driver.profileCompleted =
    allFieldsFilled &&
    allDocsUploaded &&
    allDocsApproved &&
    allDocNumbersPresent; 

    console.log("all fields filled ",allFieldsFilled)
    console.log("all docs Uploaded ",allDocsUploaded)
    console.log("all docs approved ",allDocsApproved)
    console.log("all docs number present ",allFieldsFilled)

  // const profileJustCompleted =
  //   !wasProfileCompleted && driver.profileCompleted === true;

  // if (
  //   profileJustCompleted &&
  //   driver.email &&
  //   !driver.welcomeEmailSent
  // ) {
  //   try {
  //     const html = renderTemplate("driver.welcome.html", {
  //       name: driver.name || "Captain",
  //     });

  //     await sendEmail({
  //       to: driver.email,
  //       subject: "Welcome to Rubiq Ride – You’re Ready to Drive 🚗",
  //       html,
  //     });

  //     driver.welcomeEmailSent = true;
  //   } catch (err) {
  //     console.error("Welcome email failed:", err.message);
  //   }
  // } 

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
      name: driver.name || "Captain",
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

  const result = driver.toObject ? driver.toObject() : driver;
  delete result.password;
  delete result.otp;
  delete result.otpExpiry;
  delete result.__v;

  return result;
}