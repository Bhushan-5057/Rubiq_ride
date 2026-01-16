import { Router } from "express";
import {
    createConfigController,
    getAllConfigsController,
    getConfigController,
    updateConfigController,
    updateConfigStatusController
} from "../../controllers/systemConfig/config.controller.js"
import { authorizeAdmin,authenticateAdmin } from "../../middleware/auth.middleware.js";

const router = Router()

//---------------- Create Config Route ----------------
router.post("/create", authenticateAdmin,authorizeAdmin("super_admin"), createConfigController);

//---------------- Get All Config Route ----------------
router.get("/get-all", authenticateAdmin,authorizeAdmin("super_admin"), getAllConfigsController);

//---------------- Get Config By Key ----------------
router.get("/get/:key",authenticateAdmin,authorizeAdmin("super_admin"), getConfigController);

//---------------- Update Config Route ----------------
router.put("/update/:key", authenticateAdmin,authorizeAdmin("super_admin"), updateConfigController);

//---------------- Update Config Status Route ----------------
router.put("/update-status/:key", authenticateAdmin,authorizeAdmin("super_admin"), updateConfigStatusController);

export default router