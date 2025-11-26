import { requiredFields, updatableFields, documentStatus, requiredDocs,requiredDocsNumber } from "../../../common/utlis.js";


// Service to get driver profile 
export async function getProfile(driver) {
  if (!driver) throw new Error("Driver not found");

  const result = driver.toObject ? driver.toObject() : driver;

  delete result.password;
  delete result.otp;
  delete result.otpExpiry;
  delete result.__v;

  return result;
}

// Service to update driver profile
export async function updateProfile(driver, data = {}) {
  if (!driver) throw new Error("Driver not found");

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
      if (!currentStatus || currentStatus === "not_uploaded") {
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
  driver.updatedAt = new Date();

  await driver.save();

  const result = driver.toObject ? driver.toObject() : driver;
  delete result.password;
  delete result.otp;
  delete result.otpExpiry;
  delete result.__v;

  return result;
}

