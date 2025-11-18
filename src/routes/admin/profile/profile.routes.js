import { Router } from "express";
import { authenticateAdmin } from "../../../middleware/auth.middleware.js";
import { profileController } from "../../../controllers/admin/profile/profile.controller.js";
import { logoutController } from "../../../controllers/admin/auth/auth.controller.js";
import { getAdminProfileController } from "../../../controllers/admin/management/admin.managment.js";

const router = Router();


//get all admin
router.get("/get-all", authenticateAdmin, getAdminProfileController);

router.get("/profile",authenticateAdmin , profileController);

router.post("/logout", authenticateAdmin, logoutController);



export default router;
