import { Router } from "express";
import adminRoutes from "./adminRoutes/index.js";
import passengerRoutes from "./passengerRoutes/index.js";
import driverRoutes from "./driverRoutes/index.js";

const router = Router();

router.use((req, res, next) => {
    console.log("Called", req.path);
    next();
});

router.use("/admin", adminRoutes);

router.use("/v1/passenger", passengerRoutes);

router.use("/v2/drivers", driverRoutes);

export default router;
