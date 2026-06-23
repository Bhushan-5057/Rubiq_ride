
import { Passenger } from "../../../models/passenger/passenger.model.js";
import { verifyOtp } from "../../../services/otpService/otp.service.js";
import { normalizeNumber, passengerToken } from "../../../helpers/helper.js";
import { USER_STATUS } from "../../../constants/userStatus.constants.js";
import { normalizePassengerMediaUrls } from "../../../utils/mediaUrl.js";
import { isPassengerProfileComplete } from "../../../common/utils.js";
import { canPassengerLogin } from "../../../helpers/passengerStatus.helper.js";
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
      status: USER_STATUS.ACTIVE,
      contactNumber: null,
      profileCompleted: false,
    });
  } else {
    if (!canPassengerLogin(passenger)) {
      const error = new Error("Your account is temporarily suspended kindly contact support team");
      error.status = 403;
      throw error;
    }

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
    token,
    passenger: normalizePassengerMediaUrls(passenger.toObject()),
    profileCompleted: passenger.profileCompleted,
    status: passenger.status,
    blockedReason: passenger.blockedReason || null,
    adminComment: passenger.adminComment || null,
  };
}

// -------------------- OTP Login --------------------
export async function otpLogin({ contactNumber, otp, name, email, gender, fcmToken }) {
  contactNumber = normalizeNumber(contactNumber);

  const isValidOtp = await verifyOtp(contactNumber, otp, "passenger");
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
      status: USER_STATUS.ACTIVE,
      profileCompleted: false,
    });
  } else {
    if (!canPassengerLogin(passenger)) {
      const error = new Error("Your account is temporarily suspended kindly contact support team");
      error.status = 403;
      throw error;
    }

    passenger.otpVerified = true;

    if (name && !passenger.name) passenger.name = name;
    if (email && !passenger.email) passenger.email = email;
    if (gender && !passenger.gender) passenger.gender = gender;
    if (fcmToken) passenger.fcmToken = fcmToken;

    await passenger.save();
  }

  const profileCompleted = isPassengerProfileComplete(passenger);
  if (profileCompleted !== passenger.profileCompleted) {
    passenger.profileCompleted = profileCompleted;
    await passenger.save();
  }

  const token = passengerToken(passenger);
  return {
    token,
    passenger: normalizePassengerMediaUrls(passenger.toObject()),
    profileCompleted,
    status: passenger.status,
    blockedReason: passenger.blockedReason || null,
    adminComment: passenger.adminComment || null,
  };
}
