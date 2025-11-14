import { requiredDocs, requiredFields, updatableFields } from "../../../common/utlis.js";

export async function updateProfile(driver, data = {}) {
  if (!driver) throw new Error("Driver not found");

  updatableFields.forEach((field) => {
    if (data[field] !== undefined) driver[field] = data[field];
  });

  if (data.documents && typeof data.documents === "object") {
    driver.documents = { ...driver.documents, ...data.documents };
  }
  
  driver.profileCompleted =
    requiredFields.every((f) => driver[f]) &&
    requiredDocs.every((f) => driver.documents?.[f]);

  driver.approvalStatus = driver.profileCompleted ? "fullfiled" : "incompleted";
  driver.updatedAt = new Date();

  await driver.save();

  const result = driver.toObject ? driver.toObject() : driver;
  delete result.password;
  delete result.otp;
  delete result.otpExpiry;
  delete result.__v;

  return result;
}
