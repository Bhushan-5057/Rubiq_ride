import { Router } from "express";
import { authenticateAdmin, authorizeAdmin } from "../../middleware/auth.middleware.js";
import {
    getAllAdminsController,
    registerAdminController,
    getAdminByIdController,
    updateAdminStatusController
}
    from "../../controllers/admin/management/adminManagement/admin.management.controller.js";
import { validateAdminProfileUpdate, validateCreate, validateStatusUpdate } from "../../validations/admin.validation.js";
import { validate } from "../../middleware/validate.js";
import { ROLE_PERMISSIONS } from "../../constants/userStatus.constants.js";

const router = Router();

//-------------- Create Admin Route -------------- 
router.post("/create-admin", authenticateAdmin, authorizeAdmin(...ROLE_PERMISSIONS.MANAGE_ADMINS), validateCreate, validate, registerAdminController);

//------------------- Get All Admin -------------------
router.get("/get-all", authenticateAdmin,authorizeAdmin(...ROLE_PERMISSIONS.MANAGE_ADMINS), getAllAdminsController)

//------------------- Get Admin By ID -------------------
router.get("/:adminId", authenticateAdmin,authorizeAdmin(...ROLE_PERMISSIONS.MANAGE_ADMINS), getAdminByIdController)

//----------------- Update Admin Status -----------------
router.patch("/status/:adminId", authenticateAdmin, authorizeAdmin(...ROLE_PERMISSIONS.MANAGE_ADMINS), validateStatusUpdate, validate, updateAdminStatusController);

export default router;
