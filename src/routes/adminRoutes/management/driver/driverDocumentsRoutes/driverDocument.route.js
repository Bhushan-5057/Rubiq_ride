import { Router } from "express";
import {  authenticateAdmin } from "../../../../../middleware/auth.middleware.js";
import { verifyDriverDocumentsController } from "../.../../../../../../controllers/driver/driverManagment/driverManagement.controller.js";


const router = Router();

router.put("/verify/:driverId", authenticateAdmin, verifyDriverDocumentsController);


export default router;
