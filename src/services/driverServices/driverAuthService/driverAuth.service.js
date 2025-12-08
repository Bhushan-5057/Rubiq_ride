import { sendOtp, verifyOtp } from "../../../services/otpService/otp.service.js";
import { Driver } from "../../../models/driver/driver.model.js";
import { normalizeNumber, signToken } from "../../../helpers/helper.js";
import { requiredFields } from "../../../common/utlis.js";
import jwt from "jsonwebtoken";


//send driver otp
export async function sendDriverOtp(contactNumber) {
  return await sendOtp(contactNumber,"driver");
}

//driver otp login
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

  driver.profileCompleted = requiredFields.every(Boolean);
  await driver.save();

  const token = signToken(driver);
  return { driver, token, profileCompleted: driver.profileCompleted };
}

//google login
export async function googleLogin(payload) {
  const { email, name, googleId, profileImage } = payload;
  
  // Check if driver exists with this email
  let driver = await Driver.findOne({ email });
  
  if (!driver) {
    // Create new driver with Google OAuth data
    driver = await Driver.create({
      email,
      name,
      googleId,
      profileImage,
      otpVerified: true,
      status: "pending",
      contactNumber:"pending",
      profileCompleted: false,
    });
  } else {
    // Update existing driver with Google OAuth data
    driver.googleId = googleId;
    driver.profileImage = profileImage || driver.profileImage;
    driver.name = name || driver.name;
    driver.otpVerified = true;
    await driver.save();
  }
  
  // Generate JWT token
  const token = jwt.sign(
    { id: driver._id, email: driver.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
  
  return { 
    driver, 
    token, 
    profileCompleted: driver.profileCompleted 
  };
}