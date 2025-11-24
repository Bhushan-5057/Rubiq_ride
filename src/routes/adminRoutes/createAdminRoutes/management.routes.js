import { Router } from "express";
import { authenticateAdmin } from "../../../middleware/auth.middleware.js";
import { validateRegister } from "../../../validations/admin.validation.js";
import { deleteAdminController, getAllAdminsController, registerController, updateAdminController } from "../../../controllers/admin/management/adminManagement/admin.management.controller.js";

const router = Router();

//admin create admin account
router.post("/create", authenticateAdmin, validateRegister, registerController);

//admin updated 
router.put("/update/:adminId", authenticateAdmin, updateAdminController);


//admin get all admin's
router.get("/get-all", authenticateAdmin, getAllAdminsController)

//admin delete
router.delete("/delete/:adminId", authenticateAdmin, deleteAdminController);


export default router;
