import { googleLogin, otpLogin, sendDriverOtp } from "../../../services/driverServices/index.js";
import { handleValidation } from "../../../validations/comman.validation.js";
import {OAuth2Client} from "google-auth-library" 

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

// -------------------- Send Otp --------------------
export async function sendOtpController(req, res, next) {
  try {
    handleValidation(req);
    const { contactNumber } = req.body;
    const result = await sendDriverOtp(contactNumber);
    res.json({ success: true, message: "OTP sent successfully", ...result });
  } catch (err) {
    next(err);
  }
}

// -------------------- Otp Login --------------------
export async function otpLoginDriverController(req, res, next) {
  try {
    handleValidation(req);
    const { contactNumber, otp, name, email, vehicleNumber, licenseNumber } = req.body;
    const result = await otpLogin({ contactNumber, otp, name, email, vehicleNumber, licenseNumber });

    res.json({
      success: true,
      message: "Captain Login successfully",
      token: result.token,
      driver: result.driver,
      profileCompleted: result.profileCompleted,
    });
  } catch (err) {
    next(err);
  }
}

// -------------------- Google Login --------------------
export async function googleLoginController(req, res, next) {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ success: false, message: "idToken is required" });
    }

    // Verify ID Token with Google
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    // Extract user data from token
    const userData = {
      email: payload.email,
      googleId: payload.sub,
      name: payload.name,
      profileImage: payload.picture,
    };

    // Pass verified data to service
    const result = await googleLogin(userData);

    res.json({
      success: true,
      message: "Google login successful",
      token: result.token,
      driver: result.driver,
      profileCompleted: result.profileCompleted,
    });
  } catch (err) {
    console.log(err);
    next(err);
  }
}