import { Router } from "express";
import { authenticateDriver } from "../../middleware/auth.middleware.js";
import { updateProfileValidation } from "../../validations/driver.validation.js";
import {
  deleteProfileController,
  profileController,
  updateProfileController,
} from "../../controllers/driver/driverProfile/driverProfile.controller.js";
import {
  setDriverOfflineController,
  setDriverOnlineController,
} from "../../controllers/driver/driverProfile/driverProfile.controller.js";
import { validate } from "../../middleware/validate.js";
import { uploadDriverProfileFields } from "../../middleware/upload.middleware.js";

const router = Router();

//------------------ Get Profile For Driver ------------------
router.get("/", authenticateDriver, profileController);

//------------------ Profile Update For Driver ------------------
router.put(
  "/",
  authenticateDriver,
  uploadDriverProfileFields,
  updateProfileValidation,
  validate,
  updateProfileController,
);

//------------------ Driver Go Online ------------------
router.post("/go-online", authenticateDriver, setDriverOnlineController);

//------------------ Driver Go Offline ------------------
router.post("/go-offline", authenticateDriver, setDriverOfflineController);

//------------------ Driver Delete Profile ------------------
router.delete("/delete", authenticateDriver, deleteProfileController);

export default router;
