import { Router } from "express";
import { authenticateAdmin } from "../../../middleware/auth.middleware.js";
import { profileController } from "../../../controllers/admin/adminProfile/adminProfile.controller.js";
import { logoutController } from "../../../controllers/admin/adminAuth/adminAuth.controller.js";

const router = Router();



router.get("/profile",authenticateAdmin , profileController);

router.post("/logout", authenticateAdmin, logoutController);



export default router;
