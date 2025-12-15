import { generateToken } from "../../../common/utlis.js";
import { Passenger } from "../../../models/passenger/passenger.model.js";
import { sendOtp } from "../../../services/otpService/otp.service.js";
import { logout, otpLogin } from "../../../services/passengerServices/index.js";
import { handleValidation } from "../../../validations/comman.validation.js";
import {OAuth2Client} from "google-auth-library" 

// -------------------- Send Otp --------------------
export async function sendOtpController(req, res, next) {
  try {
     handleValidation(req);  
    const { contactNumber } = req.body;
    if (!contactNumber) return res.status(400).json({ success: false, message: "Contact number required" });

    const result = await sendOtp(contactNumber ,"passenger");
    res.json({ success: true, message: "OTP sent successfully", otp: result.otp });
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
      passenger: result.passenger,
      profileCompleted: result.profileCompleted,
    });
  } catch (err) {
    console.log(err);
    next(err);
  }
}

// -------------------- OTP Login (auto-create or auto-login) --------------------
export async function otpLoginController(req, res, next) {
  try {
    handleValidation(req);
    const { contactNumber, otp, name, email, gender } = req.body;

    const result = await otpLogin({ contactNumber, otp, name, email, gender });

    res.json({
      success: true,
      message: "OTP login successfully",
      token: result.token,
      passenger: result.passenger,
      profileCompleted: result.profileCompleted,
    });
  } catch (err) {
    console.error("OTP Login Error:", err.message);

    if (err.message === "Account deactive") {
      return res.status(403).json({
        success: false,
        message: "Your account is deactive. Please contact support.",
      });
    }

    if (err.message === "Invalid or expired OTP") {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP. Please try again.",
      });
    }

    next(err); 
  }
}

// -------------------- Logout --------------------
export async function logoutController(req, res, next) {
  try {
    const result = await logout(req.passenger.id);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}
