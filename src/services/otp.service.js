import { Passenger } from "../models/passengers/Passenger.model.js";
import { Driver } from "../models/driver/Driver.model.js";
import { otpMessageTemplate } from "../common/messageTemplates.js";
import { normalizeNumber } from "../helpers/helper.js";
import { client, generateOTP, NODE_ENV, OTP_EXPIRY_MINUTES, TWILIO_PHONE_NUMBER } from "../common/utlis.js";

// -------------------- Send OTP --------------------
export async function sendOtp(contactNumber, userType = "passenger") {
  contactNumber = normalizeNumber(contactNumber);
  const otp = generateOTP();
  const expiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  const Model = userType === "driver" ? Driver : Passenger;
  console.log(`[OTP SERVICE] OTP for ${userType} (${contactNumber}): ${otp}`);

 const messageBody = otpMessageTemplate("RUBIQRIDE", otp, userType);

  try {
    const message = await client.messages.create({
      body: messageBody,
      from: TWILIO_PHONE_NUMBER,
      to: contactNumber,
    });

    console.log(
      `[TWILIO] Message sent to ${contactNumber}, SID: ${message.sid}`
    );

    const updateOptions = { upsert: true, new: true };

    await Model.findOneAndUpdate(
      { contactNumber },
      { otp, otpExpiry: expiry, otpVerified: false },
      updateOptions
    );

    return { success: true, otp: NODE_ENV === "development" ? otp : undefined };
  } catch (err) {
    console.error("[TWILIO ERROR]", err);
    throw new Error(`Twilio SMS failed: ${err.message}`);
  }
}

// -------------------- Verify OTP --------------------
export async function verifyOtp(contactNumber, otp, userType = "passenger") {
  console.log("contactNumber", contactNumber, "otp", otp, "userType", userType);
  contactNumber = normalizeNumber(contactNumber);
  const Model = userType === "driver" ? Driver : Passenger;
console.log("Model", Model);
  const user = await Model.findOne({ contactNumber }).select("+otp +otpExpiry");
  console.log("user", user);
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
