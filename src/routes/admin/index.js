import { Router } from "express";
import authRoutes from "./auth/auth.routes.js";
import profileRoutes from "./profile/profile.routes.js";
import managementRoutes from "./management/management.routes.js";
import driverManagementRoutes from "./management/driver/driver.manage.route.js";
import passengerManagementRoutes from "./management/passenger/passenger.manage.route.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/profile", profileRoutes);
router.use("/manage", managementRoutes);
router.use("/manage/drivers", driverManagementRoutes);
router.use("/manage/passengers", passengerManagementRoutes);

export default router;
