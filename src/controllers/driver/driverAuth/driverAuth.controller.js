import { Driver } from "../../../models/index.js";
import { otpLogin, sendDriverOtp } from "../../../services/driverServices/index.js";
import { handleValidation } from "../../../validations/comman.validation.js";

// -------------------- SEND OTP --------------------
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

// -------------------- OTP LOGIN --------------------
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



// -------------------- LOGIN --------------------
export async function loginController(req, res, next) {
  try {
    handleValidation(req);
    const { email, password } = req.body;
    const driver = await Driver.findOne({ email }).select("+password");

    if (!driver) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }
    if (driver.status === "deactive") {
      return res.status(403).json({ success: false, message: "Account deactive" });
    }

    const isMatch = await driver.comparePassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const token = jwt.sign({ id: driver._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    const driverData = { ...driver.toObject(), password: undefined };

    res.json({ success: true, message: "Login successful", driver: driverData, token });
  } catch (err) {
    next(err);
  }
}
