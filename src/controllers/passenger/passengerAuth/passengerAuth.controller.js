import { generateToken } from "../../../common/utlis.js";
import { Passenger } from "../../../models/passengers/passenger.model.js";
import { sendOtp } from "../../../services/otpService/otp.service.js";
import { logout, otpLogin } from "../../../services/passengerServices/index.js";
import { handleValidation } from "../../../validations/comman.validation.js";

// -------------------- Send OTP --------------------
export async function sendOtpController(req, res, next) {
  try {
    const { contactNumber } = req.body;
    if (!contactNumber) return res.status(400).json({ success: false, message: "Contact number required" });

    const result = await sendOtp(contactNumber ,"passenger");
    res.json({ success: true, message: "OTP sent successfully", otp: result.otp });
  } catch (err) {
    next(err);
  }
}

// -------------------- Login with Email/Password --------------------
export async function loginController(req, res, next) {
  try {
    handleValidation(req);

    const { email, password } = req.body;
    const passenger = await Passenger.findOne({ email }).select("+password");
    if (!passenger) return res.status(401).json({ success: false, message: "Invalid credentials" });

    if (passenger.status === "suspended")
      return res.status(403).json({ success: false, message: "Account suspended" });

    if( passenger.status === "deactive")
      return  res.status(403).json({ success: false, message: "Account deactive. Please contact support." });
    
    const isMatch = await passenger.comparePassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const token = generateToken(passenger);
    const passengerData = passenger.toObject();
    delete passengerData.password;

    res.json({ success: true, message: "Login successful", passenger: passengerData, token });
  } catch (err) {
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

    if (err.message === "Account suspended") {
      return res.status(403).json({
        success: false,
        message: "Your account is suspended. Please contact support.",
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
