import { Router } from "express";
import adminRoutes from "./adminRoutes/index.js";
import passengerRoutes from "./passengerRoutes/index.js";
import driverRoutes from "./driverRoutes/index.js";
import notificationRoutes from "./notificationRoutes/notificationRoutes.js"

const router = Router();

router.use((req, res, next) => {
    console.log("Called", req.path);
    next();
});

//--------------- Admin Route ---------------
router.use("/admin", adminRoutes);

//--------------- Passenger Route ---------------
router.use("/v1/passenger", passengerRoutes);

//--------------- Driver Route ---------------
router.use("/v2/drivers", driverRoutes);

//--------------- Notification Route ---------------
router.use("/notification", notificationRoutes);

export default router;
