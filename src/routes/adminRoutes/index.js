import { Router } from "express";
import adminAuthRoutes from "./adminAuthRoutes/adminAuth.routes.js";
import adminProfileRoutes from "./adminProfileRoutes/adminProfile.routes.js";
import managementRoutes from "./createAdminRoutes/management.routes.js";
import driverManagementRoutes from "./management/driver/driverManagementRoutes/driverManagement.route.js";
import passengerManagementRoutes from "./management/passenger/passengerManagement.route.js";
import RidesManagment from "./management/rideRoutesForAdmin/ridesForAdmin.route.js";

const router = Router();

// Admin auth routes
router.use("/auth", adminAuthRoutes);

// Admin profile routes
router.use("/profile", adminProfileRoutes);

// Admin management routes
router.use("/manage", managementRoutes);

// Specific management routes
router.use("/manage/drivers", driverManagementRoutes);

// Specific management routes
router.use("/manage/passengers", passengerManagementRoutes);

// Specific management routes
router.use("/manage/rides", RidesManagment);

export default router;
