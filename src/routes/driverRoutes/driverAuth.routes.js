import { Router } from "express";
import {  authenticateDriver } from "../../middleware/auth.middleware.js";
import {  otpLoginDriverController, sendOtpController,googleLoginController, logoutController } from "../../controllers/driver/driverAuth/driverAuth.controller.js";
import { checkDriverProfileStatusController } from "../../controllers/driver/driverProfile/driverProfile.controller.js";
import { otpLoginValidation, otpSendValidation } from "../../validations/driver.validation.js";
import { handleValidation } from "../../validations/comman.validation.js";

const router = Router();

//---------------------- Driver Google Login ---------------------- 
router.post("/google-login", googleLoginController);

//------------------- Send Otp for Driver -------------------
router.post("/send-otp", otpSendValidation,handleValidation,sendOtpController);

//------------------- Otp login For Driver ------------------- 
router.post("/otp-login", otpLoginValidation,handleValidation,otpLoginDriverController);

//------------------- Logout Route For Driver ------------------- 
router.post("/logout",authenticateDriver,logoutController);

//-------------------- Profile Status with Contact Number -------------------- 
router.get("/check-profile-status/:contactNumber", authenticateDriver, checkDriverProfileStatusController);

export default router;
