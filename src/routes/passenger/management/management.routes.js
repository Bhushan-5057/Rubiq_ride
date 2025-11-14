import { Router } from "express";

import { authenticatePassenger } from "../../../middleware/auth.middleware.js";
import { deletePassengerController } from "../../../controllers/passenger/managment/management.controller.js";


const router = Router();

//passenger delete self account
router.delete("/delete/:passengerId", authenticatePassenger, deletePassengerController);



export default router;
