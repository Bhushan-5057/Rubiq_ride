import { Router } from "express";
import {  authenticateDriver } from "../../../middleware/auth.middleware.js";
import { loginController, otpLoginDriverController, sendOtpController } from "../../../controllers/driver/auth/auth.controller.js";
import { checkDriverProfileStatusController } from "../../../controllers/driver/profile/profile.controller.js";


const router = Router();


router.post("/login", loginController);

router.post("/send-otp", sendOtpController);

router.post("/otp-login", otpLoginDriverController);

router.get("/check-profile-status/:contactNumber", authenticateDriver, checkDriverProfileStatusController);

export default router;
