import { Router } from "express";
import adminRoutes from "./admin/index.js";
import passengerRoutes from "./passenger/index.js";
import driverRoutes from "./driver/index.js";

const router = Router();

router.use((req, res, next) => {
    console.log("Called", req.path);
    next();
});

router.use("/admin", adminRoutes);

router.use("/v1/passenger", passengerRoutes);

router.use("/v2/drivers", driverRoutes);

export default router;
