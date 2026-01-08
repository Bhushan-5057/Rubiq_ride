import { Router } from "express";
import {  authenticateAdmin,authorizeAdmin } from "../../middleware/auth.middleware.js";
import { verifyDriverDocumentsController } from "../../controllers/admin/management/driverManagement/driver.management.controller.js";

const router = Router();

router.put("/verify/:driverId", authenticateAdmin,authorizeAdmin("super_admin","admin"), verifyDriverDocumentsController);

export default router;
