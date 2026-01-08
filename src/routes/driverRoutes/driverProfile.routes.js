import { Router } from "express";
import { authenticateDriver } from "../../middleware/auth.middleware.js";
import { updateProfileValidation } from "../../validations/driver.validation.js";
import { profileController, updateProfileController } from "../../controllers/driver/driverProfile/driverProfile.controller.js";
import {setDriverOfflineController,setDriverOnlineController} from "../../controllers/driver/driverProfile/driverProfile.controller.js"
import { handleValidation } from "../../validations/comman.validation.js";
import { upload } from "../../middleware/upload.middleware.js";

const router = Router();

//------------------ Get Profile For Driver ------------------ 
router.get("/get-profile", authenticateDriver, profileController);

//------------------ Profile Update For Driver ------------------ 
router.put("/profile-update", authenticateDriver,upload.any(), updateProfileValidation,handleValidation, updateProfileController); 

//------------------ Driver Go Online ------------------
router.post("/go-online", authenticateDriver, setDriverOnlineController);

//------------------ Driver Go Offline ------------------
router.post("/go-offline", authenticateDriver, setDriverOfflineController);

export default router;

 