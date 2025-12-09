import { Router } from "express";
import driverAuthRoutes from "./driverAuthRoutes/driverAuth.routes.js";
import driverProfileRoutes from "./driverProfileRoutes/driverProfile.routes.js";
import driverManagementRoutes from "./management/driverManagementRoutes/driverManagement.routes.js";

const router = Router();

// All Driver Management Routes
router.use("/auth", driverAuthRoutes);
router.use("/profile", driverProfileRoutes);
router.use("/manage", driverManagementRoutes);
router.use("/earnings", driverManagementRoutes);

export default router;