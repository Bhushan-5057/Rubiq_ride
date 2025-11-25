import { Passenger } from "../../models/passenger/passenger.model.js";
import { Driver } from "../../models/driver/driver.model.js";
import { normalizeNumber } from "../../helpers/helper.js";
import { generateOTP, OTP_EXPIRY_MINUTES } from "../../common/utlis.js";

// -------------------- Send OTP --------------------
export async function sendOtp(contactNumber, userType = "passenger") {
  contactNumber = normalizeNumber(contactNumber);
  const otp = generateOTP();
  const expiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  const Model = userType === "driver" ? Driver : Passenger;
  console.log(`[OTP SERVICE] OTP for ${userType} (${contactNumber}): ${otp}`); 

  //  const messageBody = otpMessageTemplate("RUBIQRIDE", otp, userType);

  try {
    // const message = await client.messages.create({
    //   body: messageBody,
    //   from: TWILIO_PHONE_NUMBER,
    //   to: contactNumber,
    // });

    // console.log(
    //   `[TWILIO] Message sent to ${contactNumber}, SID: ${message.sid}`
    // );    
    const updateOptions = { upsert: true, new: true };

    await Model.findOneAndUpdate(
      { contactNumber },
      { otp, otpExpiry: expiry, otpVerified: false },
      updateOptions
    );

    // For testing (and limited Twilio access), always return the OTP directly
    return { success: true, otp };
  } catch (err) {
    console.error("[OTP SERVICE] Error while saving OTP", err);
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
