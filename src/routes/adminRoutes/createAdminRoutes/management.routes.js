import { Router } from "express";
import { authenticateAdmin } from "../../../middleware/auth.middleware.js";
import { validateRegister } from "../../../validations/admin.validation.js";
import { deleteAdminController, getAllAdminsController, registerController, updateAdminController } from "../../../controllers/admin/management/adminManagement/admin.management.controller.js";

const router = Router();

//-------------- Create Admin Route -------------- 
router.post("/create", authenticateAdmin, validateRegister, registerController);

//------------------- Update Admin Route------------------- 
router.put("/update/:adminId", authenticateAdmin, updateAdminController);


//------------------- Get All Admin -------------------
router.get("/get-all", authenticateAdmin, getAllAdminsController)

//----------------- Delete Admin -----------------
router.delete("/delete/:adminId", authenticateAdmin, deleteAdminController);

export default router;