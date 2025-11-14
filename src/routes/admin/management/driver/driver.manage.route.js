import { Router } from "express";
import { authenticateAdmin } from "../../../../middleware/auth.middleware.js";
import { getAllDriversController, getDriverByIdController, updateStatusController } from "../../../../controllers/admin/management/driver/driver.manage.controller.js";
import documentsRoute from "./documents/documents.routes.js"

const router = Router();
//admin get all drivers
router.get("/get-all", authenticateAdmin, getAllDriversController);

// admin get driver by id
router.get("/get/:id", authenticateAdmin, getDriverByIdController);

//admin update driver status
router.put("/update-status", authenticateAdmin, updateStatusController);

//driver documents routes
router.use("/documents", documentsRoute);

export default router;
