import { Router } from "express";
import { authenticateAdmin, authorizeAdmin } from "../../middleware/auth.middleware.js";
import { profileController, updateMyProfileController } from "../../controllers/admin/adminProfile/adminProfile.controller.js";

const router = Router();

//--------------------- Profile Route ---------------------
router.get("/profile", authenticateAdmin, authorizeAdmin("super_admin", "admin"), profileController);

//--------------------- Update Profile Route ---------------------
router.put("/update-profile", authenticateAdmin, authorizeAdmin("super_admin", "admin"), updateMyProfileController);

export default router;