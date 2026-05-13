import { Passenger } from "../../models/passenger/passenger.model.js";
import { Driver } from "../../models/driver/driver.model.js";
import { normalizeNumber } from "../../helpers/helper.js";
import { generateOTP, OTP_EXPIRY_MINUTES } from "../../common/utlis.js";
import { sendOtpViaMsg91 } from "./msg91.service.js";

// -------------------- Send OTP --------------------
export async function sendOtp(contactNumber, userType = "passenger") {
  contactNumber = normalizeNumber(contactNumber);
  const otp = generateOTP();
  const expiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  const Model = userType === "driver" ? Driver : Passenger;
  const isDevelopment = process.env.NODE_ENV !== "production";

  try {
    if (isDevelopment) {
      console.log(`[OTP SERVICE] OTP for ${userType} (${contactNumber}): ${otp}`);
    }

    const smsResult = await sendOtpViaMsg91({ contactNumber, otp });

    const updateOptions = { upsert: true, new: true };

    await Model.findOneAndUpdate(
      { contactNumber },
      { otp, otpExpiry: expiry, otpVerified: false },
      updateOptions
    );

    return {
      success: true,
      provider: smsResult.type === "bypassed" ? "local_otp_bypass" : "msg91",
      smsStatus: smsResult.type || "success",
      ...(isDevelopment ? { otp } : {}),
    };
  } catch (err) {
    console.error("[OTP SERVICE] Error while sending OTP", err);
    throw new Error(`OTP processing failed: ${err.message}`);
  }
}

// -------------------- Verify OTP --------------------
export async function verifyOtp(contactNumber, otp, userType = "passenger") {
  contactNumber = normalizeNumber(contactNumber);
  const Model = userType === "driver" ? Driver : Passenger;
  const user = await Model.findOne({ contactNumber }).select("+otp +otpExpiry");
  if (!user || !user.otp) return false;
  if (user.otp !== otp) return false;
  if (user.otpExpiry < new Date()) return false;

  user.otpVerified = true;
  user.otp = undefined;
  user.otpExpiry = undefined;
  await user.save();

  console.log(
    `[OTP SERVICE] ${userType} verified successfully: ${contactNumber}`
  );
  return true;
}
