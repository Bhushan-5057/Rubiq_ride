import { Router } from "express";
import {  authenticateDriver } from "../../../middleware/auth.middleware.js";
import {  otpLoginDriverController, sendOtpController,googleLoginController } from "../../../controllers/driver/driverAuth/driverAuth.controller.js";
import { checkDriverProfileStatusController } from "../../../controllers/driver/driverProfile/driverProfile.controller.js";
import { otpLoginValidation, otpSendValidation } from "../../../validations/driver.validation.js";

const router = Router();


router.post("/google-login", googleLoginController);

router.post("/send-otp", otpSendValidation,sendOtpController);

router.post("/otp-login", otpLoginValidation,otpLoginDriverController);

router.get("/check-profile-status/:contactNumber", authenticateDriver, checkDriverProfileStatusController);

export default router;
