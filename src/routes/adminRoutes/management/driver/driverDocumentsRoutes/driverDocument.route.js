import { Router } from "express";
import {  authenticateAdmin } from "../../../../../middleware/auth.middleware.js";
import { verifyDriverDocumentsController } from "../../../../../controllers/admin/management/driverManagement/driver.management.controller.js";
import { authorizeAdmin } from "../../../../../middleware/auth.middleware.js";

const router = Router();

router.put("/verify/:driverId", authenticateAdmin,authorizeAdmin("super_admin","admin"), verifyDriverDocumentsController);

export default router;
