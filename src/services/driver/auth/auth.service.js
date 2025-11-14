import { sendOtp, verifyOtp } from "../../otp.service.js";
import { Driver } from "../../../models/driver/Driver.model.js";
import { normalizeNumber, signToken } from "../../../helpers/helper.js";
import { requiredFields, requiredDocs, documentStatus } from "../../../common/utlis.js";


export async function sendDriverOtp(contactNumber) {
  return await sendOtp(contactNumber, "driver");
}

export async function otpLogin(payload) {
  let {
    contactNumber,
    otp,
    name,
    email,
    vehicleNumber,
    licenseNumber,
    dateOfBirth,
    gender,
    vehicleType,
    city
  } = payload;

  contactNumber = normalizeNumber(contactNumber);
  const isValidOtp = await verifyOtp(contactNumber, otp, "driver");
  if (!isValidOtp) throw new Error("Invalid or expired OTP");

  let driver = await Driver.findOne({ contactNumber });

  if (!driver) {
    driver = await Driver.create({
      contactNumber,
      name,
      email,
      vehicleNumber,
      licenseNumber,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      gender,
      vehicleType,
      city,
      otpVerified: true,
      status: "active",
      profileCompleted: false,
    });
  } else {

    driver.otpVerified = true;

    const fields = {
      name,
      email,
      vehicleNumber,
      licenseNumber,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      gender,
      vehicleType,
      city,
    };

    for (const key in fields) {
      if (fields[key]) driver[key] = fields[key];
    }

    await driver.save();
  }

  // Recompute profile completion with fields, uploads, and approvals
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
  const docs = driver.documents || {};
  const allDocsUploaded = requiredDocs.every((docKey) => Boolean(docs[docKey]));
  const allDocsApproved = documentStatus.every((status) => docs[status] === "approved");
  driver.profileCompleted = allFieldsFilled && allDocsUploaded && allDocsApproved;
  await driver.save();

  const token = signToken(driver);
  return { driver, token, profileCompleted: driver.profileCompleted };
}

