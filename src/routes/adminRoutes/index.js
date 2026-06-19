import { Router } from "express";
import adminAuthRoutes from "./adminAuth.routes.js";
import adminProfileRoutes from "./adminProfile.routes.js";
import managementRoutes from "./management.routes.js";
import driverManagementRoutes from "./driverManagement.route.js";
import passengerManagementRoutes from "./passengerManagement.route.js";
import RidesManagment from "./ridesForAdmin.route.js";
import reportRoutes from "./report.routes.js";
import pricingRoutes from "./pricing.routes.js";
import { adminComplaintRouter } from "../complaintRoutes/complaint.routes.js";

const router = Router();

//-------------- Admin Auth Route --------------
router.use("/auth", adminAuthRoutes);

//--------------- Admin Profile Route ---------------
router.use("/profile", adminProfileRoutes);

//---------------- Driver Management Route ----------------
router.use("/manage/drivers", driverManagementRoutes);

//------------------ Passenger Management Route ------------------
router.use("/manage/passengers", passengerManagementRoutes);

//------------------ Ride Management Route ------------------
router.use("/manage/rides", RidesManagment);

//------------------ ComplaintsManagement Route ------------------
router.use("/manage/complaints", adminComplaintRouter);

//--------------- Admin Management Route ---------------
router.use("/manage", managementRoutes);

//--------------- Report Route ---------------
router.use("/reports", reportRoutes);

//--------------- Pricing Route ---------------
router.use("/pricing", pricingRoutes);

export default router;
