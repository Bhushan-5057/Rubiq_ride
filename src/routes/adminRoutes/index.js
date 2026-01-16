import { Router } from "express";
import adminAuthRoutes from "./adminAuth.routes.js";
import adminProfileRoutes from "./adminProfile.routes.js";
import managementRoutes from "./management.routes.js";
import driverManagementRoutes from "./driverManagement.route.js";
import passengerManagementRoutes from "./passengerManagement.route.js";
import RidesManagment from "./ridesForAdmin.route.js";
import SystemConfigRoutes from "../configRoutes/systemConfig.routes.js"

const router = Router();

//-------------- Admin Auth Route --------------
router.use("/auth", adminAuthRoutes);

//--------------- Admin Profile Route ---------------
router.use("/profile", adminProfileRoutes);

//--------------- Admin Management Route ---------------
router.use("/manage", managementRoutes);

//---------------- Driver Management Route ----------------
router.use("/manage/drivers", driverManagementRoutes);

//------------------ Passenger Management Route ------------------
router.use("/manage/passengers", passengerManagementRoutes);

//------------------ Ride Management Route ------------------
router.use("/manage/rides", RidesManagment);

//------------------ Configuration Management Route ------------------
router.use("/manage/system-config", SystemConfigRoutes);

export default router;
