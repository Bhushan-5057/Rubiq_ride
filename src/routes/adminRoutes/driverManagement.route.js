import { Router } from "express";
import { authenticateAdmin } from "../../middleware/auth.middleware.js";
import { getAllDriversController, getDriverByIdController, updateActiveStatusController, updateStatusController } 
from "../../controllers/admin/management/driverManagement/driver.management.controller.js";
import documentsRoute from "./driverDocument.route.js"
import { authorizeAdmin } from "../../middleware/auth.middleware.js";
import { validateLifecycleStatusUpdate, validateStatusUpdate } from "../../validations/admin.validation.js";
import { validate } from "../../middleware/validate.js";
import { ROLE_PERMISSIONS } from "../../constants/userStatus.constants.js";

const router = Router();
//admin get all drivers
router.get("/get-all", authenticateAdmin,authorizeAdmin(...ROLE_PERMISSIONS.MANAGE_DRIVERS), getAllDriversController);

// admin get driver by id
router.get("/get/:id", authenticateAdmin,authorizeAdmin(...ROLE_PERMISSIONS.MANAGE_DRIVERS), getDriverByIdController);

//admin update driver status
router.put("/update-status", authenticateAdmin,authorizeAdmin(...ROLE_PERMISSIONS.MANAGE_DRIVERS), validateLifecycleStatusUpdate, validate, updateStatusController);
router.patch("/status/:driverId", authenticateAdmin, authorizeAdmin(...ROLE_PERMISSIONS.MANAGE_DRIVERS), validateStatusUpdate, validate, updateActiveStatusController);

//driver documents routes
router.use("/documents", documentsRoute);

export default router;
