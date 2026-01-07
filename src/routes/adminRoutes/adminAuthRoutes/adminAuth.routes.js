import { Router } from "express";
import {  validateLogin} from "../../../validations/admin.validation.js";
import { loginController,logoutController } from "../../../controllers/admin/adminAuth/adminAuth.controller.js";
import { handleValidation } from "../../../validations/comman.validation.js";

const router = Router();

//--------------- Admin Login --------------- 
router.post("/login", validateLogin,handleValidation, loginController);

//--------------------- Logout Route ---------------------
router.post("/logout", logoutController);

export default router;