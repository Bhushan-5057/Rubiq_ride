import { Router } from "express";
import { authenticateAdmin, authorizeAdmin } from "../../middleware/auth.middleware.js";
import { profileController, updateMyProfileController } from "../../controllers/admin/adminProfile/adminProfile.controller.js";
import { validateAdminProfileUpdate } from "../../validations/admin.validation.js";
import { validate } from "../../middleware/validate.js";
import { ROLE_PERMISSIONS } from "../../constants/userStatus.constants.js";

const router = Router();

//--------------------- Profile Route ---------------------
router.get("/", authenticateAdmin, authorizeAdmin(...ROLE_PERMISSIONS.READ_ADMIN_PROFILE), profileController);

//--------------------- Update Profile Route ---------------------
router.put("/", authenticateAdmin, authorizeAdmin(...ROLE_PERMISSIONS.READ_ADMIN_PROFILE), validateAdminProfileUpdate, validate, updateMyProfileController);

export default router;
