import { Router } from "express";
import { authenticateAdmin } from "../../../middleware/auth.middleware.js";
import { validateRegister } from "../../../validations/admin.validation.js";
import { registerController } from "../../../controllers/admin/management/admin.managment.js";


const router = Router();

//admin create admin account
router.post("/create", authenticateAdmin, validateRegister, registerController);



export default router;
