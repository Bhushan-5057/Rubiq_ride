import { Router } from "express";
import { authenticateAdmin } from "../../middleware/auth.middleware.js";
import { getAllDriversController, getDriverByIdController, updateStatusController } 
from "../../controllers/admin/management/driverManagement/driver.management.controller.js";
import documentsRoute from "./driverDocument.route.js"
import { authorizeAdmin } from "../../middleware/auth.middleware.js";

const router = Router();
//admin get all drivers
router.get("/get-all", authenticateAdmin,authorizeAdmin("super_admin","admin"), getAllDriversController);

// admin get driver by id
router.get("/get/:id", authenticateAdmin,authorizeAdmin("super_admin","admin"), getDriverByIdController);

//admin update driver status
router.put("/update-status", authenticateAdmin,authorizeAdmin("super_admin","admin"), updateStatusController);

//driver documents routes
router.use("/documents", documentsRoute);

export default router;
