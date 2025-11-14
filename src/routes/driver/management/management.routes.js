import { Router } from "express";
import {
  authenticateDriver,
} from "../../../middleware/auth.middleware.js";
import { deleteDriverController } from "../../../controllers/driver/managment/management.controller.js";

const router = Router();
//driver delete self account
router.delete("/delete/:driverId", authenticateDriver, deleteDriverController);


export default router;
