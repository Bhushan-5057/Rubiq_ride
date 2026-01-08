import { Router } from "express";
import passengerAuthRoutes from "./passengerAuth.routes.js";
import passengerProfileRoutes from "./pasengerProfile.routes.js";
import managementRoutes from "./management.routes.js";
import paymentRoutes from "../payment/payment.routes.js";
import feedbackRoutes from "../feedback/feedback.routes.js"

const router = Router();

//------------------------ Passenger Management Routes ------------------------
router.use("/auth", passengerAuthRoutes);
router.use("/profile", passengerProfileRoutes);
router.use("/manage", managementRoutes);
router.use("/payment", paymentRoutes);
router.use("/feedback", feedbackRoutes);

export default router;