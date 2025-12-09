import { Router } from "express";
import {  authenticateDriver} from "../../../../middleware/auth.middleware.js";
import { deleteDriverController } from "../../../../controllers/driver/driverManagment/driverManagement.controller.js";
import { getDriverEarningsController } from "../../../../controllers/driver/driverManagment/driverEarning.controller.js";
import rideManagementRoutes from "../driverRideManagementRoutes/driverRideManagement.route.js";

const router = Router();

//----------------- Delete Driver ----------------- 
router.delete("/delete/:driverId", authenticateDriver, deleteDriverController);

//-------------------- Ride Management Route --------------------
router.use("/driver-ride", rideManagementRoutes);

//-------------------- Driver Earning Route --------------------
router.get("/:driverId", authenticateDriver, getDriverEarningsController)

export default router;