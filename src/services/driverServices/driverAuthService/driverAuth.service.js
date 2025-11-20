import { sendOtp, verifyOtp } from "../../../services/otpService/otp.service.js";
import { Driver } from "../../../models/driver/driver.model.js";
import { normalizeNumber, signToken } from "../../../helpers/helper.js";

export async function sendDriverOtp(contactNumber) {
  return await sendOtp(contactNumber,"driver");
}

export async function otpLogin(payload) {
  console.log("payload", payload);
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

  console.log("contactNumber", contactNumber, "otp", otp);

  contactNumber = normalizeNumber(contactNumber);
  const isValidOtp = await verifyOtp(contactNumber, otp, "driver");
  console.log("isValidOtp", isValidOtp);
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
      status: "pending",
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

  // ✅ compute profile completion correctly
  const requiredFields = [
    driver.name,
    driver.email,
    driver.vehicleNumber,
    driver.licenseNumber,
    driver.vehicleType,
    driver.city,
    driver.gender,
    driver.dateOfBirth,
  ];

  driver.profileCompleted = requiredFields.every(Boolean);
  await driver.save();

  const token = signToken(driver);
  return { driver, token, profileCompleted: driver.profileCompleted };
}

