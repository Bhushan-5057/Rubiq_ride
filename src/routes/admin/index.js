import { Router } from "express";
import authRoutes from "./auth/auth.routes.js";
import profileRoutes from "./profile/profile.routes.js";
import managementRoutes from "./management/management.routes.js";
import driverManagementRoutes from "./management/driver/driver.manage.route.js";
import passengerManagementRoutes from "./management/passenger/passenger.manage.route.js";
import RidesManagment from "./management/rides/rides.manage.route.js";

const router = Router();

// Admin auth routes
router.use("/auth", authRoutes);

// Admin profile routes
router.use("/profile", profileRoutes);

// Admin management routes
router.use("/manage", managementRoutes);

// Specific management routes
router.use("/manage/drivers", driverManagementRoutes);

// Specific management routes
router.use("/manage/passengers", passengerManagementRoutes);

// Specific management routes
router.use("/manage/rides", RidesManagment);

export default router;
