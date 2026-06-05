import { Router } from "express";
import {  authenticateDriver} from "../../middleware/auth.middleware.js";
import { getDriverEarningsController } from "../../controllers/driver/driverManagment/driverEarning.controller.js";
import rideManagementRoutes from "./driverRideManagement.route.js";

const router = Router();

//-------------------- Ride Management Route --------------------
router.use("/driver-ride", rideManagementRoutes);

//-------------------- Driver Earning Route --------------------
router.get("/:driverId", authenticateDriver, getDriverEarningsController)

export default router;
