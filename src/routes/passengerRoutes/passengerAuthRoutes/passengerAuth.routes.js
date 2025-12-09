import { Router } from "express";
import { authenticateAdmin } from "../../../middleware/auth.middleware.js";
import { otpLoginValidation, otpSendValidation } from "../../../validations/passenger.validation.js";
import { otpLoginController, sendOtpController } from "../../../controllers/passenger/passengerAuth/passengerAuth.controller.js";
import { checkProfileStatusController } from "../../../controllers/passenger/passengerManagment/passengerManagement.controller.js";

const router = Router();

// router.post("/register", registerPassengerValidation, registerController);

//---------------- Send Otp ----------------
router.post("/send-otp", otpSendValidation, sendOtpController);

//---------------- Otp Login----------------
router.post("/otp-login", otpLoginValidation, otpLoginController);

//-------------------- Profile Status on Contact Number --------------------
router.get("/check-profile-status/:contactNumber", authenticateAdmin, checkProfileStatusController);

export default router;
