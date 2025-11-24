import { Router } from "express";
import {
  authenticateDriver,
} from "../../../../middleware/auth.middleware.js";
import { deleteDriverController } from "../../../../controllers/driver/driverManagment/driverManagement.controller.js";
import rideManagementRoutes from "../driverRideManagementRoutes/driverRideManagement.route.js";


const router = Router();
//driver delete self account
router.delete("/delete/:driverId", authenticateDriver, deleteDriverController);

// Other driver management routes can be added here
router.use("/driver-ride",rideManagementRoutes);


export default router;
