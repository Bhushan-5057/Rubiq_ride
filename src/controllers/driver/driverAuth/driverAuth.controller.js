import { googleLogin, otpLogin, sendDriverOtp } from "../../../services/driverServices/index.js";
import { getGoogleClient } from "../../../config/googleOAuth.js"
import { logout } from "../../../services/driverServices/driverAuthService/driverAuth.service.js"

// const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

// -------------------- Send Otp --------------------
export async function sendOtpController(req, res, next) {
  try {
    const { contactNumber } = req.body;
    const result = await sendDriverOtp(contactNumber);
    res.json({ success: true, message: "OTP sent successfully", ...result });
  } catch (error) {
    next(error);
  }
}

// -------------------- Otp Login --------------------
export async function otpLoginDriverController(req, res, next) {
  try {
    const { contactNumber, otp, name, email, vehicleNumber, licenseNumber, fcmToken } = req.body;
    const result = await otpLogin({ contactNumber, otp, name, email, vehicleNumber, licenseNumber, fcmToken });

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

    const client = getGoogleClient();

    // Verify ID Token with Google
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { fcmToken } = req.body;

    // Extract user data from token
    const userData = {
      email: payload.email,
      googleId: payload.sub,
      name: payload.name,
      profileImage: payload.picture,
      fcmToken: fcmToken || null,
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
  } catch (error) {
    console.log(error);
    next(error);
  }
}

//-------------------------- Driver Logout --------------------------

export async function logoutController(req, res, next) {
  try {
    if (!req.driver || !req.driver._id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const result = await logout(req.driver._id);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}
