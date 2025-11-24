import { Router } from "express";
import {
  validateLogin,
} from "../../../validations/admin.validation.js";
import { loginController } from "../../../controllers/admin/adminAuth/adminAuth.controller.js";

const router = Router();

router.post("/login", validateLogin, loginController);
;

export default router;
