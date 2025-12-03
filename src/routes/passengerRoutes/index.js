import { Router } from "express";
import passengerAuthRoutes from "./passengerAuthRoutes/passengerAuth.routes.js";
import passengerProfileRoutes from "./passengerProfileRoutes/pasengerProfile.routes.js";
import managementRoutes from "./management/management.routes.js";
import paymentRoutes from "../payment/payment.routes.js";

const router = Router();

router.use("/auth", passengerAuthRoutes);
router.use("/profile", passengerProfileRoutes);
router.use("/manage", managementRoutes);
router.use("/payment", paymentRoutes);

export default router;
