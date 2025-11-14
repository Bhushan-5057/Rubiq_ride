import { Router } from "express";
import {  authenticateAdmin } from "../../../../../middleware/auth.middleware.js";
import { verifyDriverDocumentsController } from "../../../../../controllers/driver/managment/management.controller.js";



const router = Router();

router.patch("/verify/:driverId", authenticateAdmin, verifyDriverDocumentsController);


export default router;
