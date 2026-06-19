import { Router } from "express";
import {
  validateLogin,
  validateSuperAdminRegister,
} from "../../validations/admin.validation.js";
import {
  loginController,
  logoutController,
  registerSuperAdminController,
} from "../../controllers/admin/adminAuth/adminAuth.controller.js";
import { validate } from "../../middleware/validate.js";

const router = Router();

//--------------- One-time Super Admin Bootstrap ---------------
router.post(
  "/register",
  validateSuperAdminRegister,
  validate,
  registerSuperAdminController,
);

//--------------- Admin Login ---------------
router.post("/login", validateLogin, validate, loginController);

//--------------------- Logout Route ---------------------
router.post("/logout", logoutController);

export default router;
