
import { Passenger } from "../../../models/passenger/passenger.model.js";
import { verifyOtp } from "../../../services/otpService/otp.service.js";
import { normalizeNumber, passengerToken } from "../../../helpers/helper.js";
import jwt from "jsonwebtoken";


// -------------------- Google Login --------------------
export async function googleLogin(payload) {
  const { email, name, googleId, profileImage, fcmToken } = payload;
  
  // Check if passenger exists with this email
  let passenger = await Passenger.findOne({ email });
  
  if (!passenger) {
    // Create new passenger with Google OAuth data
    passenger = await Passenger.create({
      email,
      name,
      googleId,
      profileImage,
      fcmToken: fcmToken || null,
      otpVerified: true,
      status: "active",
      contactNumber:null,
      profileCompleted: false,
    });
  } else {
    // Update existing passenger with Google OAuth data
    passenger.googleId = googleId;
    passenger.profileImage = profileImage || passenger.profileImage;
    passenger.name = name || passenger.name;
    passenger.fcmToken = fcmToken || passenger.fcmToken;
    passenger.otpVerified = true;
    await passenger.save();
  }
  
  // Generate JWT token
  const token = passengerToken({
    _id: passenger._id,
    role: "passenger",
  });
  
  return { 
    passenger, 
    token, 
    profileCompleted: passenger.profileCompleted 
  };
}

// -------------------- OTP Login --------------------
export async function otpLogin({ contactNumber, otp, name, email, gender, fcmToken }) {
  contactNumber = normalizeNumber(contactNumber);

  const isValidOtp = await verifyOtp(contactNumber, otp ,"passenger");
  if (!isValidOtp) throw new Error("Invalid or expired OTP");

  let passenger = await Passenger.findOne({ contactNumber });

  if (!passenger) {
    passenger = await Passenger.create({
      contactNumber,
      otpVerified: true,
      name: name || "",
      email: email || null,
      gender: gender || "",
      fcmToken: fcmToken || null,
      status: "active",
      profileCompleted: false,
    });
  } else {
    passenger.otpVerified = true;

    if (name && !passenger.name) passenger.name = name;
    if (email && !passenger.email) passenger.email = email;
    if (gender && !passenger.gender) passenger.gender = gender;
    if (fcmToken) passenger.fcmToken = fcmToken;

    await passenger.save();
  }

  const profileCompleted = Boolean(passenger.name || passenger.email || passenger.gender);
  if (profileCompleted !== passenger.profileCompleted) {
    passenger.profileCompleted = profileCompleted;
    await passenger.save();
  }

  const token = passengerToken(passenger);
  return { passenger: passenger, token, profileCompleted };
}
