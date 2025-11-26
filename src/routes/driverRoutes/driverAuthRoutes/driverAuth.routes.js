import { Router } from "express";
import {  authenticateDriver } from "../../../middleware/auth.middleware.js";
import { loginController, otpLoginDriverController, sendOtpController } from "../../../controllers/driver/driverAuth/driverAuth.controller.js";
import { checkDriverProfileStatusController } from "../../../controllers/driver/driverProfile/driverProfile.controller.js";
import { otpLoginValidation, otpSendValidation } from "../../../validations/driver.validation.js";

const router = Router();


router.post("/login", loginController);

router.post("/send-otp", otpSendValidation,sendOtpController);

router.post("/otp-login", otpLoginValidation,otpLoginDriverController);

router.get("/check-profile-status/:contactNumber", authenticateDriver, checkDriverProfileStatusController);

export default router;
