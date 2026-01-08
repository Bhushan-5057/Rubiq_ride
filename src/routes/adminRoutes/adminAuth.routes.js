import { Router } from "express";
import {  validateLogin} from "../../validations/admin.validation.js";
import { loginController,logoutController } from "../../controllers/admin/adminAuth/adminAuth.controller.js";

const router = Router();

//--------------- Admin Login --------------- 
router.post("/login", validateLogin, loginController);

//--------------------- Logout Route ---------------------
router.post("/logout", logoutController);

export default router;