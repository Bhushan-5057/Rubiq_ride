import { Router } from "express";
import {
  authenticateAdmin,
  authorizeAdmin,
} from "../../middleware/auth.middleware.js";
import { verifyDriverDocumentsController } from "../../controllers/admin/management/driverManagement/driver.management.controller.js";
import { verifyDriverDocumentsValidation } from "../../validations/driverDocument.validation.js";

const router = Router();

router.put(
  "/verify/:driverId",
  authenticateAdmin,
  authorizeAdmin("super_admin", "admin"),
  ...verifyDriverDocumentsValidation,
  verifyDriverDocumentsController,
);

export default router;
