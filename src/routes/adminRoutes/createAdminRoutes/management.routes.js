import { Router } from "express";
import { authenticateAdmin } from "../../../middleware/auth.middleware.js";
import { validateRegister } from "../../../validations/admin.validation.js";
import { registerController } from "../../../controllers/admin/adminAuth/adminAuth.controller.js";


const router = Router();

//admin create admin account
router.post("/create", authenticateAdmin, validateRegister, registerController);

export default router;
