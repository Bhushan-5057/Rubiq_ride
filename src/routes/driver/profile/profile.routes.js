import { Router } from "express";
import { authenticateDriver } from "../../../middleware/auth.middleware.js";
import { updateProfileValidation } from "../../../validations/driver.validation.js";
import { profileController, updateProfileController } from "../../../controllers/driver/profile/profile.controller.js";


const router = Router();

router.get("/profile", authenticateDriver, profileController);

router.put("/profile-update",authenticateDriver, updateProfileValidation, updateProfileController);

export default router;

 