import { sendOtp, verifyOtp } from "../../../services/otpService/otp.service.js";
import { Driver } from "../../../models/driver/driver.model.js";
import { normalizeNumber, driverToken } from "../../../helpers/helper.js";
import { requiredFields } from "../../../common/utlis.js";
import { sendEmail, renderTemplate } from "../../../utils/mailer.js";
import jwt from "jsonwebtoken";


//----------------------- Send Otp -----------------------
export async function sendDriverOtp(contactNumber) {
  return await sendOtp(contactNumber, "driver");
}

//----------------------- otp Login -----------------------
export async function otpLogin(payload) {
  let {
    contactNumber,
    otp,
    name,
    email,
    vehicleNumber,
    dateOfBirth,
    gender,
    vehicleType,
    city,
    fcmToken
  } = payload;

  contactNumber = normalizeNumber(contactNumber);
  const isValidOtp = await verifyOtp(contactNumber, otp, "driver");
  if (!isValidOtp) throw new Error("Invalid or expired OTP");

  let driver = await Driver.findOne({ contactNumber });

  if (!driver) {
    driver = await Driver.create({
      name,
      email,
      contactNumber,
      vehicleNumber,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      gender,
      vehicleType,
      city,
      fcmToken: fcmToken || null,
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
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      gender,
      vehicleType,
      city,
      fcmToken: fcmToken || driver.fcmToken,
    };

    for (const key in fields) {
      if (fields[key] && key !== 'fcmToken') driver[key] = fields[key];
      else if (key === 'fcmToken') driver[key] = fields[key];
    }

    await driver.save();
  }

  driver.profileCompleted = requiredFields.every(Boolean);
  await driver.save();

  const token = driverToken({
    _id: driver._id,
    role: "driver",
  });
  return { driver, token, profileCompleted: driver.profileCompleted };
}

//----------------------- Google Login -----------------------
export async function googleLogin(payload) {
  let {
    name,
    email,
    contactNumber,
    dateOfBirth,
    googleId,
    profileImage,
    fcmToken,
    otpVerified,
    gender,
    vehicleType,
    city,
    status,
    vehicleNumber,
    profileCompleted,
  } = payload;

  // Check if driver exists with this email
  let driver = await Driver.findOne({ email });

  if (!driver) {
    // Create new driver with Google OAuth data
    driver = await Driver.create({
      name,
      email,
      contactNumber: null,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      googleId,
      profileImage,
      fcmToken: fcmToken || null,
      otpVerified: true,
      gender,
      vehicleType,
      city,
      status: "pending",
      vehicleNumber,
      profileCompleted: false,
    });
  } else {
    // Update existing driver with Google OAuth data
    driver.googleId = googleId;
    driver.profileImage = profileImage || driver.profileImage;
    driver.name = name || driver.name;
    driver.fcmToken = fcmToken || driver.fcmToken;
    driver.otpVerified = true;
    await driver.save();
  }

  if (driver.email && !driver.welcomeEmailSent) {
    try {
      const html = renderTemplate("driver.welcome.html", {
        name: driver.name || "Captain",
      });

      await sendEmail({
        to: driver.email,
        subject: " Welcome to Rubiq Ride – Start Driving 🚗",
        html,
      });

      driver.welcomeEmailSent = true;
    } catch (error) {
      console.error("Welcome email failed:", error.message);
    }
  }
  await driver.save();

  // Generate JWT token
  const token = jwt.sign(
    { sub: driver._id, email: driver.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  return {
    driver,
    token,
    profileCompleted: driver.profileCompleted
  };
}

//------------------------------- Driver Logout Service ------------------------------- 

export async function logout(driverId) {
  await Driver.findByIdAndUpdate(driverId, { lastLogoutAt: new Date() });
  return { message: "Driver Logged out successfully" };
}