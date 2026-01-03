import { Router } from "express";
import { authenticateAdmin, authorizeAdmin } from "../../../middleware/auth.middleware.js";
import {
    deleteAdminController,
    getAllAdminsController,
    createAdminController,
    updateAdminController,
    getAdminByIdController,
    restoreAdminController
}
    from "../../../controllers/admin/management/adminManagement/admin.management.controller.js";

const router = Router();

//-------------- Create Admin Route -------------- 
router.post("/create-admin", authenticateAdmin,authorizeAdmin("super_admin"), createAdminController);

//------------------- Get All Admin -------------------
router.get("/get-all", authenticateAdmin,authorizeAdmin("super_admin"), getAllAdminsController)

//------------------- Get Admin By ID -------------------
router.get("/:adminId", authenticateAdmin,authorizeAdmin("super_admin"), getAdminByIdController)

//------------------- Update Admin Route------------------- 
router.put("/update/:adminId", authenticateAdmin,authorizeAdmin("super_admin"), updateAdminController);

//----------------- Delete Admin -----------------
router.delete("/delete/:adminId", authenticateAdmin,authorizeAdmin("super_admin"), deleteAdminController);

//----------------- Restore Admin -----------------
router.post("/restore/:adminId", authenticateAdmin,authorizeAdmin("super_admin"), restoreAdminController);

export default router;