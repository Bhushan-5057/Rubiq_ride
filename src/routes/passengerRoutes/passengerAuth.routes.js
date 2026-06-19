import { Router } from "express";
import { authenticateAdmin } from "../../middleware/auth.middleware.js";
import {
  otpLoginValidation,
  otpSendValidation,
} from "../../validations/passenger.validation.js";
import {
  otpLoginController,
  sendOtpController,
  googleLoginController,
} from "../../controllers/passenger/passengerAuth/passengerAuth.controller.js";
import { checkProfileStatusController } from "../../controllers/passenger/passengerManagment/passengerManagement.controller.js";
import { validate } from "../../middleware/validate.js";

const router = Router();

//---------------- Google Login Route ----------------
router.post("/google-login", googleLoginController);

//---------------- Send Otp ----------------
router.post(
  "/send-otp",
  otpSendValidation,
  validate,
  sendOtpController,
);

//---------------- Otp Login----------------
router.post(
  "/otp-login",
  otpLoginValidation,
  validate,
  otpLoginController,
);

//-------------------- Profile Status on Contact Number --------------------
router.get(
  "/check-profile-status/:contactNumber",
  authenticateAdmin,
  checkProfileStatusController,
);

export default router;
