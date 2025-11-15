import { requiredFields, updatableFields, documentStatus, requiredDocs } from "../../../common/utlis.js";

export async function updateProfile(driver, data = {}) {
  console.log("driver in service:", driver);
  if (!driver) throw new Error("Driver not found");

  if (typeof data.dateOfBirth === "string" && data.dateOfBirth.trim() === "") {
    driver.dateOfBirth = null;
    delete data.dateOfBirth;
  }

  updatableFields.forEach((field) => {
    if (data[field] !== undefined) driver[field] = data[field];
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
  console.log("All fields filled:", allFieldsFilled);
  console.log("All docs uploaded:", allDocsUploaded);
  console.log("All docs approved:", allDocsApproved);
  driver.profileCompleted = allFieldsFilled && allDocsUploaded && allDocsApproved;
  console.log("Profile completion status:", driver.profileCompleted);
  driver.updatedAt = new Date();

  await driver.save();

  const result = driver.toObject ? driver.toObject() : driver;
  delete result.password;
  delete result.otp;
  delete result.otpExpiry;
  delete result.__v;

  return result;
}
