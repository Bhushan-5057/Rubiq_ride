import { Router } from "express";
import { updatePassengerValidation } from "../../validations/passenger.validation.js";
import { authenticatePassenger } from "../../middleware/auth.middleware.js";
import { upload } from "../../middleware/upload.middleware.js";
import { logoutController } from "../../controllers/passenger/passengerAuth/passengerAuth.controller.js";
import { profileController, updateProfileController } from "../../controllers/passenger/passengerProfile/passengerProfile.controller.js";

const router = Router();

//-------------------------- Get Profile --------------------------
router.get("/get-profile", authenticatePassenger, profileController);

//----------------------- Update Profile -----------------------
router.put("/profile-update", authenticatePassenger,  upload.any(), updatePassengerValidation, updateProfileController);

//--------------------- Logout Profile ---------------------
router.post("/logout", authenticatePassenger, logoutController);

export default router;
