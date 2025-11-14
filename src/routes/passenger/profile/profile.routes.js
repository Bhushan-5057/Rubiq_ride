import { Router } from "express";

import { updatePassengerValidation } from "../../../validations/passenger.validation.js";
import { authenticatePassenger } from "../../../middleware/auth.middleware.js";
import { upload } from "../../../middleware/upload.middleware.js";
import { logoutController } from "../../../controllers/passenger/auth/auth.controller.js";
import { profileController, updateProfileController } from "../../../controllers/passenger/profile/profile.controller.js";

const router = Router();

router.get("/profile", authenticatePassenger, profileController);

router.put("/profile-update", authenticatePassenger,  upload.any(), updatePassengerValidation, updateProfileController);

router.post("/logout", authenticatePassenger, logoutController);

export default router;
