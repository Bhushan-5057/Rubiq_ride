import { Router } from "express";
import { authenticateAdmin } from "../../../middleware/auth.middleware.js";
import { profileController } from "../../../controllers/admin/adminProfile/adminProfile.controller.js";
import { logoutController } from "../../../controllers/admin/adminAuth/adminAuth.controller.js";

const router = Router();

//--------------------- Profile Route ---------------------
router.get("/profile",authenticateAdmin , profileController);

//--------------------- Logout Route ---------------------
router.post("/logout", authenticateAdmin, logoutController);

export default router;