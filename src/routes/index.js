import { Router } from "express";
import adminRoutes from "./adminRoutes/index.js";
import passengerRoutes from "./passengerRoutes/index.js";
import driverRoutes from "./driverRoutes/index.js";
import notificationRoutes from "./notificationRoutes/notification.routes.js"
import  complaintRoutes  from "./complaintRoutes/complaint.routes.js";
import bankAccountRoutes from "./bankAccount/bankAccount.routes.js";

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

//--------------- Compalint Route ---------------
router.use("/complaint", complaintRoutes);

//--------------- Bank Account Route ---------------
router.use("/bank-account", bankAccountRoutes);

export default router;
