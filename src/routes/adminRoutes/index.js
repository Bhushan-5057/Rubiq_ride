import { Router } from "express";
import adminAuthRoutes from "./adminAuthRoutes/adminAuth.routes.js";
import adminProfileRoutes from "./adminProfileRoutes/adminProfile.routes.js";
import managementRoutes from "./createAdminRoutes/management.routes.js";
import driverManagementRoutes from "./management/driver/driverManagementRoutes/driverManagement.route.js";
import passengerManagementRoutes from "./management/passenger/passengerManagement.route.js";
import RidesManagment from "./management/rideRoutesForAdmin/ridesForAdmin.route.js";

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

export default router;
